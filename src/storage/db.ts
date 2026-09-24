import Dexie, { type EntityTable } from 'dexie'
import type { Card } from '@/types/card'
import type { ImportRecord } from '@/types/import'
import type { Settings } from '@/types/settings'
import type { StandardTransaction } from '@/types/transaction'

export class Web3SpendDB extends Dexie {
  cards!: EntityTable<Card, 'id'>
  transactions!: EntityTable<StandardTransaction, 'id'>
  imports!: EntityTable<ImportRecord, 'id'>
  settings!: EntityTable<Settings, 'key'>

  constructor(name = 'web3spend') {
    super(name)
    this.version(1).stores({
      cards: 'id, last4, cardHolderKey',
      transactions:
        'id, cardId, identityKey, importId, [cardId+timestampUtc], [currency+timestampUtc]',
      imports: 'id, fileHash, importedAt',
      settings: 'key',
    })
  }
}

/** The person's own imported data. */
export const realDb = new Web3SpendDB()

/** The synthetic demo dataset, in a database of its own with the same
 * schema, so the demo can be opened at any time without touching or mixing
 * with real data (MVP-PLAN §5: "a separate, disposable dataset"). */
export const demoDb = new Web3SpendDB('web3spend-demo')

/**
 * The database everything else reads and writes: realDb, or demoDb while
 * the demo is on screen. It's a live binding, so every module that imports
 * `db` sees a switch as soon as it happens; only dataSource.ts switches it,
 * through setActiveDatabase.
 */
export let db: Web3SpendDB = realDb

export function setActiveDatabase(database: Web3SpendDB): void {
  db = database
}
