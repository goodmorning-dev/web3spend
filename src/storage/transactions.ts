import { applyCustomCategories } from '@/categorization/customCategories'
import type { StandardTransaction } from '@/types/transaction'
import { db } from './db'

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

/** Puts every edited field of an imported transaction back to what the
 * import reported. Its category is left alone; that's set separately.
 * Only categories can be changed now, but edits made while amounts and
 * dates still could be can still be undone this way. */
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
 * come back with the next import. Adding one by hand isn't possible any
 * more, but one added before can still be removed. */
export async function deleteManualTransaction(id: string): Promise<void> {
  await db.transaction('rw', db.transactions, async () => {
    const existing = await db.transactions.get(id)
    if (existing?.source !== 'manual') {
      throw new Error('Only transactions you added yourself can be deleted.')
    }
    await db.transactions.delete(id)
  })
}
