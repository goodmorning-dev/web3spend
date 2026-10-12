import { applyCategoryChoice, createCategory, type CategoryChoice } from './categories'
import { db } from './db'
import {
  addManualTransaction,
  updateTransaction,
  type ManualTransactionInput,
  type TransactionChanges,
} from './transactions'

export type SaveTarget =
  | { kind: 'add'; input: ManualTransactionInput }
  | { kind: 'edit'; id: string; changes: TransactionChanges }

export type SaveCategoryChoice = Omit<CategoryChoice, 'selection'> & {
  selection: CategoryChoice['selection'] | { kind: 'new'; name: string }
}

/**
 * Everything the edit form saves, as one database transaction: a new
 * category if one was typed in, the transaction itself, and its category
 * and rules. If any part fails, none of it is kept, so a retry after an
 * error can never leave a half-saved edit or add the same purchase twice.
 * Returns the transaction's id.
 */
export async function saveTransaction(
  target: SaveTarget,
  choice: SaveCategoryChoice,
): Promise<string> {
  return db.transaction('rw', [db.transactions, db.categories, db.categoryRules], async () => {
    const selection: CategoryChoice['selection'] =
      choice.selection.kind === 'new'
        ? { kind: 'custom', categoryId: (await createCategory(choice.selection.name)).id }
        : choice.selection

    let id: string
    if (target.kind === 'add') {
      id = await addManualTransaction(target.input)
    } else {
      id = target.id
      await updateTransaction(id, target.changes)
    }

    await applyCategoryChoice(id, { ...choice, selection })
    return id
  })
}
