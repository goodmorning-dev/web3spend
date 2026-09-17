import { db } from './db'

export async function resetDatabase(): Promise<void> {
  await Promise.all([
    db.cards.clear(),
    db.transactions.clear(),
    db.imports.clear(),
    db.settings.clear(),
  ])
}
