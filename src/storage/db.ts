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

  constructor() {
    super('web3spend')
    this.version(1).stores({
      cards: 'id, last4, cardHolderKey',
      transactions:
        'id, cardId, identityKey, importId, [cardId+timestampUtc], [currency+timestampUtc]',
      imports: 'id, fileHash, importedAt',
      settings: 'key',
    })
  }
}

export const db = new Web3SpendDB()
