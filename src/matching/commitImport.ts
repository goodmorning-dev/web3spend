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
}

/**
 * TECHNICAL-PLAN §5 step 7: apply every add/update plus the import record in one
 * Dexie transaction, so a failure partway through leaves existing data untouched.
 */
export async function commitImport(
  rows: ParsedTransactionRow[],
  options: CommitImportOptions,
): Promise<CommitImportResult> {
  const importId = crypto.randomUUID()
  let added = 0
  let updated = 0

  await db.transaction('rw', db.cards, db.transactions, db.imports, async () => {
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
        const status: TransactionStatus = resolveStatusTransition(existing.status, row.status)
        await db.transactions.put({
          ...existing,
          status,
          cashbackMinor: row.cashbackMinor,
          cashbackCurrency: row.cashbackCurrency,
          importId,
        })
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

  return { importId, rowCounts: { added, updated, unsupported: options.unsupportedCount } }
}
