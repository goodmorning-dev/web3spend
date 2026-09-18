import { afterEach, describe, expect, it } from 'vitest'
import { db } from './db'
import { deleteAllData } from './deleteAllData'
import { resetDatabase } from './test-helpers'

afterEach(resetDatabase)

describe('deleteAllData', () => {
  it('clears every table: cards, transactions, imports, and settings', async () => {
    await db.cards.put({ id: 'card-1', last4: '1234', cardHolderKey: 'jane doe', label: 'Card' })
    await db.transactions.put({
      id: 'txn-1',
      cardId: 'card-1',
      timestampUtc: '2026-01-15T10:00:00.000Z',
      type: 'card_spend',
      description: 'Coffee Shop',
      status: 'CLEARED',
      amountMinor: 450,
      currency: 'EUR',
      originalAmountMinor: 450,
      originalCurrency: 'EUR',
      cashbackMinor: 9,
      cashbackCurrency: 'EUR',
      categoryRaw: 'Groceries',
      spendingMode: 'Direct Pay',
      identityKey: 'key-1',
      importId: 'import-1',
    })
    await db.imports.put({
      id: 'import-1',
      fileHash: 'hash-1',
      importedAt: '2026-01-15T10:00:00.000Z',
      parserVersion: '1',
      rowCounts: { added: 1, updated: 0, unsupported: 0 },
    })
    await db.settings.put({ key: 'preferences', schemaVersion: 1 })

    await deleteAllData()

    expect(await db.cards.count()).toBe(0)
    expect(await db.transactions.count()).toBe(0)
    expect(await db.imports.count()).toBe(0)
    expect(await db.settings.count()).toBe(0)
  })
})
