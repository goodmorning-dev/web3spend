import {
  buildDemoRows,
  DEMO_CARD_HOLDER_KEY,
  DEMO_FILE_HASH,
  DEMO_PARSER_VERSION,
} from '@/adapters/demoData'
import { commitImport } from '@/matching/commitImport'
import { getDataSource, setDataSource } from './dataSource'
import { demoDb, realDb } from './db'
import { clearDatabase } from './deleteAllData'

/**
 * True once the person has imported any real data. Always reads their own
 * database, whichever dataset is on screen. The demo's import record is
 * ignored in case an older version of the app left it there (see
 * removeLegacyDemoData).
 */
export async function hasRealData(): Promise<boolean> {
  return (await realDb.imports.where('fileHash').notEqual(DEMO_FILE_HASH).count()) > 0
}

/**
 * Puts the demo on screen with a freshly built dataset, through the same
 * commitImport pipeline a real file import uses. The demo database is
 * emptied first, so the demo's dates are always relative to today and
 * opening it again never duplicates anything. Real data isn't touched. If
 * building it fails, whatever was on screen before comes back.
 */
export async function openDemo(): Promise<void> {
  const previous = getDataSource()
  setDataSource('demo')
  try {
    await clearDatabase(demoDb)
    await commitImport(buildDemoRows(), {
      fileHash: DEMO_FILE_HASH,
      parserVersion: DEMO_PARSER_VERSION,
      unsupportedCount: 0,
    })
  } catch (err) {
    setDataSource(previous)
    throw err
  }
}

/**
 * Older versions of the app loaded the demo into the person's own
 * database and removed it again when they imported real data. Anything
 * still left there from that is removed here: the demo import record, its
 * transactions, and its cards. Real data is untouched, and it's a no-op
 * when there's nothing to remove.
 */
export async function removeLegacyDemoData(): Promise<void> {
  await realDb.transaction('rw', realDb.cards, realDb.transactions, realDb.imports, async () => {
    const demoImport = await realDb.imports.where('fileHash').equals(DEMO_FILE_HASH).first()
    if (demoImport) {
      await realDb.transactions.where('importId').equals(demoImport.id).delete()
      await realDb.imports.delete(demoImport.id)
    }
    await realDb.cards.where('cardHolderKey').equals(DEMO_CARD_HOLDER_KEY).delete()
  })
}
