import { setDataSource } from './dataSource'
import type { Table } from 'dexie'
import { demoDb, realDb, type Web3SpendDB } from './db'

/**
 * Empties a database in a single Dexie transaction, so a failure partway
 * through (a quota error, a browser killing the connection mid-clear)
 * leaves every table exactly as it was rather than only some of them
 * emptied. With keepCategories, the person's own categories and rules are
 * left in place; everything else goes.
 */
export async function clearDatabase(
  database: Web3SpendDB,
  { keepCategories = false }: { keepCategories?: boolean } = {},
): Promise<void> {
  const tables: Table[] = [
    database.cards,
    database.transactions,
    database.imports,
    database.settings,
  ]
  if (!keepCategories) {
    tables.push(database.categories, database.categoryRules)
  }
  await database.transaction('rw', tables, async () => {
    for (const table of tables) {
      await table.clear()
    }
  })
}

/**
 * MVP-PLAN §5: "Delete all local financial data after confirmation."
 * Every card, transaction, import record and setting goes, in the
 * person's own database and the demo's alike, and the app goes back to
 * showing their (now empty) data.
 *
 * Their own categories and rules are kept: they hold no financial data,
 * take effort to set up, and the rules file a fresh import the same way
 * again. They have a separate delete (deleteAllCategories). The demo is
 * disposable, so it's emptied completely.
 *
 * Their own data is cleared first. If that fails, nothing has changed and
 * the caller gets a rejected promise; a transaction can't span two
 * databases, so the demo is cleared separately afterward.
 */
export async function deleteAllData(): Promise<void> {
  await clearDatabase(realDb, { keepCategories: true })
  await clearDatabase(demoDb)
  setDataSource('real')
}
