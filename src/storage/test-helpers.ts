import { setDataSource } from './dataSource'
import { demoDb, realDb } from './db'
import { clearDatabase } from './deleteAllData'

/** Empties both databases completely, categories included, unlike the
 * app's own "Delete all data", which keeps them. */
export async function resetDatabase(): Promise<void> {
  await clearDatabase(realDb)
  await clearDatabase(demoDb)
  setDataSource('real')
}
