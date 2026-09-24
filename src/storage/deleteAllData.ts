import { setDataSource } from './dataSource'
import { demoDb, realDb, type Web3SpendDB } from './db'

/**
 * Empties every table of one database in a single Dexie transaction, so a
 * failure partway through (a quota error, a browser killing the connection
 * mid-clear) leaves every table exactly as it was rather than only some of
 * them emptied.
 */
export async function clearDatabase(database: Web3SpendDB): Promise<void> {
  await database.transaction(
    'rw',
    database.cards,
    database.transactions,
    database.imports,
    database.settings,
    async () => {
      await database.cards.clear()
      await database.transactions.clear()
      await database.imports.clear()
      await database.settings.clear()
    },
  )
}

/**
 * MVP-PLAN §5: "Delete all local financial data after confirmation. This is
 * the only data-management control in the MVP." There's nothing else
 * stored locally worth preserving, so every table is cleared, in the
 * person's own database and the demo's alike, and the app goes back to
 * showing their (now empty) data.
 *
 * Their own data is cleared first. If that fails, nothing has changed and
 * the caller gets a rejected promise; a transaction can't span two
 * databases, so the demo is cleared separately afterward.
 */
export async function deleteAllData(): Promise<void> {
  await clearDatabase(realDb)
  await clearDatabase(demoDb)
  setDataSource('real')
}
