import { afterEach, describe, expect, it } from 'vitest'
import { buildDemoRows, DEMO_FILE_HASH, DEMO_PARSER_VERSION } from '@/adapters/demoData'
import { commitImport } from '@/matching/commitImport'
import { clearDemoData, hasRealData } from './demoData'
import { db } from './db'
import { resetDatabase } from './test-helpers'

afterEach(resetDatabase)

async function loadDemo() {
  return commitImport(buildDemoRows(), {
    fileHash: DEMO_FILE_HASH,
    parserVersion: DEMO_PARSER_VERSION,
    unsupportedCount: 0,
  })
}

async function commitRealImport() {
  return commitImport(
    [
      {
        last4: '1234',
        cardHolderKey: 'jane doe',
        timestampUtc: '2026-01-15T10:00:00.000Z',
        type: 'card_spend',
        description: 'Merchant A',
        status: 'CLEARED',
        amountMinor: 450,
        currency: 'EUR',
        originalAmountMinor: 450,
        originalCurrency: 'EUR',
        cashbackMinor: 14,
        cashbackCurrency: 'EUR',
        categoryRaw: '5411 - Grocery Stores and Supermarkets',
        spendingMode: 'Direct Pay',
      },
    ],
    { fileHash: 'real-hash-1', parserVersion: 'test-1', unsupportedCount: 0 },
  )
}

describe('hasRealData', () => {
  it('is false when there is no data at all', async () => {
    expect(await hasRealData()).toBe(false)
  })

  it('is false when only the demo dataset has been loaded', async () => {
    await loadDemo()
    expect(await hasRealData()).toBe(false)
  })

  it('is true once a real import exists, demo loaded or not', async () => {
    await commitRealImport()
    expect(await hasRealData()).toBe(true)

    await resetDatabase()
    await loadDemo()
    await commitRealImport()
    expect(await hasRealData()).toBe(true)
  })
})

describe('clearDemoData', () => {
  it('removes the demo import, its transactions, and its cards', async () => {
    await loadDemo()
    expect(await db.transactions.count()).toBeGreaterThan(0)
    expect(await db.cards.where('cardHolderKey').equals('demo').count()).toBeGreaterThan(0)

    await clearDemoData()

    expect(await db.transactions.count()).toBe(0)
    expect(await db.cards.count()).toBe(0)
    expect(await db.imports.where('fileHash').equals(DEMO_FILE_HASH).count()).toBe(0)
  })

  it('leaves real data untouched', async () => {
    await commitRealImport()
    await clearDemoData()

    expect(await db.transactions.count()).toBe(1)
    expect(await db.cards.count()).toBe(1)
  })

  it('is a no-op when the demo was never loaded', async () => {
    await expect(clearDemoData()).resolves.toBeUndefined()
    expect(await db.transactions.count()).toBe(0)
  })
})
