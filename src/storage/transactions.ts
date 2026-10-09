import { applyCustomCategories } from '@/categorization/customCategories'
import { normalizeText } from '@/parsing/normalize'
import { EDITABLE_FIELDS, type EditableField, type StandardTransaction } from '@/types/transaction'
import { db } from './db'

/** importId on a transaction the person added by hand. */
export const MANUAL_IMPORT_ID = 'manual'

export function listTransactions(): Promise<StandardTransaction[]> {
  return db.transactions.toArray()
}

/**
 * Every transaction with the person's own categories applied (see
 * applyCustomCategories). This is what anything that shows or totals
 * transactions should read; the raw table is only for editing.
 */
export async function loadTransactions(): Promise<StandardTransaction[]> {
  const [transactions, categories, rules] = await Promise.all([
    db.transactions.toArray(),
    db.categories.toArray(),
    db.categoryRules.toArray(),
  ])
  return applyCustomCategories(transactions, categories, rules)
}

export function getTransaction(id: string): Promise<StandardTransaction | undefined> {
  return db.transactions.get(id)
}

export function findTransactionByIdentityKey(
  identityKey: string,
): Promise<StandardTransaction | undefined> {
  return db.transactions.where('identityKey').equals(identityKey).first()
}

export function putTransaction(transaction: StandardTransaction): Promise<string> {
  return db.transactions.put(transaction)
}

export function bulkPutTransactions(transactions: StandardTransaction[]): Promise<string> {
  return db.transactions.bulkPut(transactions)
}

export interface ManualTransactionInput {
  cardId: string
  timestampUtc: string
  description: string
  amountMinor: number
  currency: string
  cashbackMinor: number
  status: StandardTransaction['status']
  spendingMode: StandardTransaction['spendingMode']
  categoryRaw: string
  categoryId?: string
}

/** Adds a transaction the person entered themselves. Its identity key is
 * unique to it, so no import can ever match or overwrite it. */
export async function addManualTransaction(input: ManualTransactionInput): Promise<string> {
  const id = crypto.randomUUID()
  const transaction: StandardTransaction = {
    id,
    cardId: input.cardId,
    timestampUtc: input.timestampUtc,
    type: 'card_spend',
    description: normalizeText(input.description),
    status: input.status,
    amountMinor: input.amountMinor,
    currency: input.currency,
    originalAmountMinor: input.amountMinor,
    originalCurrency: input.currency,
    cashbackMinor: input.cashbackMinor,
    cashbackCurrency: input.currency,
    categoryRaw: input.categoryRaw,
    spendingMode: input.spendingMode,
    identityKey: `manual:${id}`,
    importId: MANUAL_IMPORT_ID,
    source: 'manual',
    ...(input.categoryId ? { categoryId: input.categoryId } : {}),
  }
  await db.transactions.put(transaction)
  return id
}

export type TransactionChanges = Partial<
  Pick<StandardTransaction, EditableField | 'cardId' | 'currency' | 'categoryRaw'>
>

/**
 * Applies the person's changes to a transaction.
 *
 * A manual transaction is simply overwritten. An imported one keeps track
 * of which fields were changed and what the import said for each, so a
 * later import doesn't undo the edit (commitImport skips edited fields)
 * and resetTransactionEdits can put the imported values back. Changing a
 * field back to what the import said counts as no longer edited. Card,
 * currency and ether.fi's category can't be changed on an imported
 * transaction and are ignored.
 */
export async function updateTransaction(id: string, changes: TransactionChanges): Promise<void> {
  await db.transaction('rw', db.transactions, async () => {
    const existing = await db.transactions.get(id)
    if (!existing) {
      throw new Error('That transaction no longer exists.')
    }

    if (existing.source === 'manual') {
      const next: StandardTransaction = { ...existing, ...changes }
      if (changes.description !== undefined) {
        next.description = normalizeText(changes.description)
      }
      next.originalAmountMinor = next.amountMinor
      next.originalCurrency = next.currency
      next.cashbackCurrency = next.currency
      await db.transactions.put(next)
      return
    }

    const editable: Partial<Pick<StandardTransaction, EditableField>> = {}
    for (const field of EDITABLE_FIELDS) {
      if (changes[field] !== undefined) {
        setField(editable, field, changes[field])
      }
    }
    if (editable.description !== undefined) {
      editable.description = normalizeText(editable.description)
    }
    // A purchase made in the card's own currency has an original amount
    // equal to its amount; keep the two together so the list doesn't
    // start offering an "original amount" that only differs because of
    // the edit.
    if (
      editable.amountMinor !== undefined &&
      editable.originalAmountMinor === undefined &&
      existing.originalCurrency === existing.currency &&
      existing.originalAmountMinor === existing.amountMinor
    ) {
      editable.originalAmountMinor = editable.amountMinor
    }

    const next: StandardTransaction = { ...existing }
    const edited = new Set(existing.editedFields ?? [])
    const importedValues = { ...existing.importedValues }
    for (const field of EDITABLE_FIELDS) {
      if (editable[field] === undefined) {
        continue
      }
      const importedValue = edited.has(field) ? importedValues[field] : existing[field]
      if (editable[field] === importedValue) {
        edited.delete(field)
        delete importedValues[field]
      } else if (!edited.has(field)) {
        setField(importedValues, field, existing[field])
        edited.add(field)
      }
      setField(next, field, editable[field])
    }
    // An edited cashback amount means "this much, in this currency": the
    // currency is kept with it, and an import can't swap it underneath (see
    // commitImport). Changing the amount back to what the import said takes
    // the imported currency back too.
    if (edited.has('cashbackMinor')) {
      importedValues.cashbackCurrency ??= existing.cashbackCurrency
    } else if (importedValues.cashbackCurrency !== undefined) {
      next.cashbackCurrency = importedValues.cashbackCurrency
      delete importedValues.cashbackCurrency
    }

    if (edited.size > 0) {
      next.editedFields = EDITABLE_FIELDS.filter((field) => edited.has(field))
      next.importedValues = importedValues
    } else {
      delete next.editedFields
      delete next.importedValues
    }
    await db.transactions.put(next)
  })
}

function setField<K extends EditableField>(
  target: Partial<Pick<StandardTransaction, EditableField>>,
  field: K,
  value: StandardTransaction[K] | undefined,
): void {
  target[field] = value
}

/** Puts every edited field of an imported transaction back to what the
 * import reported. Its category is left alone; that's set separately. */
export async function resetTransactionEdits(id: string): Promise<void> {
  await db.transaction('rw', db.transactions, async () => {
    const existing = await db.transactions.get(id)
    if (!existing || !existing.editedFields) {
      return
    }
    const next: StandardTransaction = { ...existing, ...existing.importedValues }
    delete next.editedFields
    delete next.importedValues
    await db.transactions.put(next)
  })
}

/** Files one transaction under a category (a CustomCategory id, or
 * ORIGINAL_CATEGORY_ID), or with undefined, lets rules decide again. */
export async function setTransactionCategory(
  id: string,
  categoryId: string | undefined,
): Promise<void> {
  await db.transactions
    .where('id')
    .equals(id)
    .modify((transaction) => {
      if (categoryId === undefined) {
        delete transaction.categoryId
      } else {
        transaction.categoryId = categoryId
      }
    })
}

/** Only manual transactions can be deleted: an imported one would just
 * come back with the next import. */
export async function deleteManualTransaction(id: string): Promise<void> {
  await db.transaction('rw', db.transactions, async () => {
    const existing = await db.transactions.get(id)
    if (existing?.source !== 'manual') {
      throw new Error('Only transactions you added yourself can be deleted.')
    }
    await db.transactions.delete(id)
  })
}
