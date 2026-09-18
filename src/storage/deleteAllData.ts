import { db } from './db'

/**
 * MVP-PLAN §5: "Delete all local financial data after confirmation. This is
 * the only data-management control in the MVP." There's nothing else
 * stored locally worth preserving, so every table is cleared.
 *
 * All four clears run in one Dexie transaction, so a failure partway
 * through (a quota error, a browser killing the connection mid-clear)
 * leaves every table exactly as it was rather than only some of them
 * emptied; a caller sees either a clean success or a rejected promise with
 * nothing changed, never a mix of the two.
 */
export async function deleteAllData(): Promise<void> {
  await db.transaction('rw', db.cards, db.transactions, db.imports, db.settings, async () => {
    await db.cards.clear()
    await db.transactions.clear()
    await db.imports.clear()
    await db.settings.clear()
  })
}
