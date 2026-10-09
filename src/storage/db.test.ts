import { afterEach, describe, expect, it } from 'vitest'
import Dexie from 'dexie'
import { db, Web3SpendDB } from './db'
import { resetDatabase } from './test-helpers'

afterEach(resetDatabase)

describe('Web3SpendDB', () => {
  it('creates the current schema with the expected tables', async () => {
    await db.open()
    expect(db.verno).toBe(2)
    expect(db.tables.map((table) => table.name).sort()).toEqual([
      'cards',
      'categories',
      'categoryRules',
      'imports',
      'settings',
      'transactions',
    ])
  })

  it('opens a database created by the previous version without losing anything', async () => {
    const name = `web3spend-upgrade-${crypto.randomUUID()}`
    const old = new Dexie(name)
    old.version(1).stores({
      cards: 'id, last4, cardHolderKey',
      transactions:
        'id, cardId, identityKey, importId, [cardId+timestampUtc], [currency+timestampUtc]',
      imports: 'id, fileHash, importedAt',
      settings: 'key',
    })
    await old.table('transactions').put({ id: 'txn-1', cardId: 'card-1' })
    old.close()

    const upgraded = new Web3SpendDB(name)
    expect(await upgraded.transactions.get('txn-1')).toMatchObject({ cardId: 'card-1' })
    expect(await upgraded.categories.count()).toBe(0)
    await upgraded.delete()
  })
})
