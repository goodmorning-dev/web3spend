import { afterEach, describe, expect, it } from 'vitest'
import { buildDemoRows, DEMO_FILE_HASH, DEMO_PARSER_VERSION } from '@/adapters/demoData'
import { commitImport } from '@/matching/commitImport'
import { getDataSource } from './dataSource'
import { db, demoDb, realDb } from './db'
import { hasRealData, openDemo, removeLegacyDemoData } from './demoData'
import { resetDatabase } from './test-helpers'

afterEach(resetDatabase)

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

/** How older versions loaded the demo: straight into the person's own
 * database. */
async function commitLegacyDemo() {
  return commitImport(buildDemoRows(), {
    fileHash: DEMO_FILE_HASH,
    parserVersion: DEMO_PARSER_VERSION,
    unsupportedCount: 0,
  })
}

describe('openDemo', () => {
  it('puts the demo on screen from its own database', async () => {
    await openDemo()

    expect(getDataSource()).toBe('demo')
    expect(db).toBe(demoDb)
    expect(await demoDb.transactions.count()).toBeGreaterThan(0)
    expect(await realDb.transactions.count()).toBe(0)
  })

  it('opens alongside real data without touching it', async () => {
    await commitRealImport()

    await openDemo()

    expect(getDataSource()).toBe('demo')
    expect(await demoDb.transactions.count()).toBeGreaterThan(0)
    expect(await realDb.transactions.count()).toBe(1)
    expect(await realDb.cards.count()).toBe(1)
  })

  it('rebuilds the demo when opened again rather than adding a second copy', async () => {
    await openDemo()
    const firstCount = await demoDb.transactions.count()

    await openDemo()

    expect(await demoDb.transactions.count()).toBe(firstCount)
    expect(await demoDb.imports.count()).toBe(1)
  })
})

describe('hasRealData', () => {
  it('is false when there is no data at all', async () => {
    expect(await hasRealData()).toBe(false)
  })

  it('is false when only the demo has been opened', async () => {
    await openDemo()
    expect(await hasRealData()).toBe(false)
  })

  it('is true once a real import exists, even while the demo is on screen', async () => {
    await commitRealImport()
    await openDemo()
    expect(await hasRealData()).toBe(true)
  })

  it('ignores a demo that an older version left in the real database', async () => {
    await commitLegacyDemo()
    expect(await hasRealData()).toBe(false)
  })
})

describe('removeLegacyDemoData', () => {
  it('removes old demo rows from the real database and leaves real data alone', async () => {
    await commitRealImport()
    await commitLegacyDemo()
    expect(await realDb.transactions.count()).toBeGreaterThan(1)

    await removeLegacyDemoData()

    expect(await realDb.transactions.count()).toBe(1)
    expect(await realDb.cards.count()).toBe(1)
    expect(await realDb.imports.where('fileHash').equals(DEMO_FILE_HASH).count()).toBe(0)
  })

  it('is a no-op when there is nothing to remove', async () => {
    await expect(removeLegacyDemoData()).resolves.toBeUndefined()
    expect(await realDb.transactions.count()).toBe(0)
  })
})
