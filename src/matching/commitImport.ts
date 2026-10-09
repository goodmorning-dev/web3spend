import { db } from '@/storage/db'
import type { ImportRowCounts } from '@/types/import'
import type { StandardTransaction, TransactionStatus } from '@/types/transaction'
import { resolveCard } from './cardIdentity'
import { computeIdentityKey } from './identityKey'
import { resolveStatusTransition } from './statusTransition'

/**
 * A single already-normalized row, as a (future) parsing module would produce
 * it from an XLSX file. Card identity fields are separate from StandardTransaction
 * because the card isn't resolved to a local `cardId` until commit time.
 */
export type ParsedTransactionRow = Omit<
  StandardTransaction,
  'id' | 'cardId' | 'identityKey' | 'importId'
> & {
  last4: string
  cardHolderKey: string
}

export interface CommitImportOptions {
  fileHash: string
  parserVersion: string
  unsupportedCount: number
}

export interface CommitImportResult {
  importId: string
  rowCounts: ImportRowCounts
  /**
   * True when this exact file (by content hash) was already committed
   * before. No rows were touched; importId and rowCounts are copied from
   * that earlier import record.
   */
  alreadyImported: boolean
}

/**
 * TECHNICAL-PLAN §5 step 7: apply every add/update plus the import record in one
 * Dexie transaction, so a failure partway through leaves existing data untouched.
 *
 * The fileHash short-circuit lives inside that same transaction rather than as
 * a pre-check in the caller: without it, two uploads of the identical file
 * racing each other could both pass a "not yet imported" check before either
 * commits, and a stale re-upload of an old file could overwrite a newer
 * correction a later import already made to the same rows.
 */
export async function commitImport(
  rows: ParsedTransactionRow[],
  options: CommitImportOptions,
): Promise<CommitImportResult> {
  const importId = crypto.randomUUID()
  let added = 0
  let updated = 0
  let repeat: CommitImportResult | null = null

  await db.transaction('rw', db.cards, db.transactions, db.imports, async () => {
    const existingImport = await db.imports.where('fileHash').equals(options.fileHash).first()
    if (existingImport) {
      repeat = {
        importId: existingImport.id,
        rowCounts: existingImport.rowCounts,
        alreadyImported: true,
      }
      return
    }

    for (const row of rows) {
      const card = await resolveCard(row.last4, row.cardHolderKey)
      const identityKey = await computeIdentityKey({
        cardId: card.id,
        timestampUtc: row.timestampUtc,
        normalizedDescription: row.description,
        amountMinor: row.amountMinor,
        currency: row.currency,
      })

      const existing = await db.transactions.where('identityKey').equals(identityKey).first()

      if (existing) {
        // A field the person edited by hand keeps their value; what the
        // import reports for it goes into importedValues instead, so it's
        // current if they ever undo the edit (storage/transactions.ts).
        const edited = new Set(existing.editedFields ?? [])
        const imported = { ...existing, ...existing.importedValues }
        const status: TransactionStatus = resolveStatusTransition(imported.status, row.status)
        // If the resolved status differs from what this row actually reported, its
        // status got rejected as stale (statusTransition.ts), so the rest of what
        // it reported, cashback included, is equally untrustworthy and gets rejected
        // too. A report whose status matches (whether unchanged or a real transition
        // the rule allowed) is trusted, so its cashback figures apply as normal.
        const isStaleReport = row.status !== status
        const cashbackMinor = isStaleReport ? imported.cashbackMinor : row.cashbackMinor

        const next: StandardTransaction = {
          ...existing,
          cashbackCurrency: isStaleReport ? existing.cashbackCurrency : row.cashbackCurrency,
          importId,
        }
        if (edited.has('status')) {
          next.importedValues = { ...next.importedValues, status }
        } else {
          next.status = status
        }
        if (edited.has('cashbackMinor')) {
          next.importedValues = { ...next.importedValues, cashbackMinor }
        } else {
          next.cashbackMinor = cashbackMinor
        }
        await db.transactions.put(next)
        updated += 1
      } else {
        const transaction: StandardTransaction = {
          id: crypto.randomUUID(),
          cardId: card.id,
          identityKey,
          importId,
          timestampUtc: row.timestampUtc,
          type: row.type,
          description: row.description,
          status: row.status,
          amountMinor: row.amountMinor,
          currency: row.currency,
          originalAmountMinor: row.originalAmountMinor,
          originalCurrency: row.originalCurrency,
          cashbackMinor: row.cashbackMinor,
          cashbackCurrency: row.cashbackCurrency,
          categoryRaw: row.categoryRaw,
          spendingMode: row.spendingMode,
        }
        await db.transactions.put(transaction)
        added += 1
      }
    }

    await db.imports.put({
      id: importId,
      fileHash: options.fileHash,
      importedAt: new Date().toISOString(),
      parserVersion: options.parserVersion,
      rowCounts: { added, updated, unsupported: options.unsupportedCount },
    })
  })

  if (repeat) {
    return repeat
  }

  return {
    importId,
    rowCounts: { added, updated, unsupported: options.unsupportedCount },
    alreadyImported: false,
  }
}
