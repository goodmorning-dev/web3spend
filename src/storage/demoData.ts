import { DEMO_FILE_HASH, DEMO_CARD_HOLDER_KEY } from '@/adapters/demoData'
import { db } from './db'

/**
 * True once any import other than the synthetic demo dataset exists. Used to
 * keep the demo a "separate, disposable dataset" (MVP-PLAN §5): it should
 * never be loaded on top of a person's real transactions.
 */
export async function hasRealData(): Promise<boolean> {
  const imports = await db.imports.toArray()
  return imports.some((record) => record.fileHash !== DEMO_FILE_HASH)
}

/**
 * Removes the demo dataset and nothing else: the demo import record, the
 * transactions it created, and the demo card(s). Real data, if any, is
 * untouched. A no-op if the demo was never loaded.
 */
export async function clearDemoData(): Promise<void> {
  await db.transaction('rw', db.cards, db.transactions, db.imports, async () => {
    const demoImport = await db.imports.where('fileHash').equals(DEMO_FILE_HASH).first()
    if (demoImport) {
      await db.transactions.where('importId').equals(demoImport.id).delete()
      await db.imports.delete(demoImport.id)
    }
    await db.cards.where('cardHolderKey').equals(DEMO_CARD_HOLDER_KEY).delete()
  })
}
