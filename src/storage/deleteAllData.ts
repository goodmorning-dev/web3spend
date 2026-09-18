import { db } from './db'

/**
 * MVP-PLAN §5: "Delete all local financial data after confirmation. This is
 * the only data-management control in the MVP." There's nothing else
 * stored locally worth preserving, so every table is cleared.
 */
export async function deleteAllData(): Promise<void> {
  await Promise.all([
    db.cards.clear(),
    db.transactions.clear(),
    db.imports.clear(),
    db.settings.clear(),
  ])
}
