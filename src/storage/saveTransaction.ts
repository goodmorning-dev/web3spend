import { applyCategoryChoice, createCategory, type CategoryChoice } from './categories'
import { db } from './db'

export type SaveCategoryChoice = Omit<CategoryChoice, 'selection'> & {
  selection: CategoryChoice['selection'] | { kind: 'new'; name: string }
}

/**
 * Everything the category form saves, as one database transaction: a new
 * category if one was typed in, then the transaction's category and
 * rules. If any part fails, none of it is kept, so a retry after an error
 * can never leave a category behind without the choice that made it.
 */
export async function saveTransactionCategory(
  transactionId: string,
  choice: SaveCategoryChoice,
): Promise<void> {
  await db.transaction('rw', [db.transactions, db.categories, db.categoryRules], async () => {
    const selection: CategoryChoice['selection'] =
      choice.selection.kind === 'new'
        ? { kind: 'custom', categoryId: (await createCategory(choice.selection.name)).id }
        : choice.selection
    await applyCategoryChoice(transactionId, { ...choice, selection })
  })
}
