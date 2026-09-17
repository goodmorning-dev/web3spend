import { afterEach, describe, expect, it, vi } from 'vitest'
import { db } from '@/storage/db'
import { resetDatabase } from '@/storage/test-helpers'
import { commitImport, type ParsedTransactionRow } from './commitImport'

afterEach(async () => {
  vi.restoreAllMocks()
  await resetDatabase()
})

function makeRow(overrides: Partial<ParsedTransactionRow> = {}): ParsedTransactionRow {
  return {
    last4: '4242',
    cardHolderKey: 'jane doe',
    timestampUtc: '2026-01-15T10:00:00.000Z',
    type: 'card_spend',
    description: 'Coffee Shop',
    status: 'PENDING',
    amountMinor: 450,
    currency: 'USD',
    originalAmountMinor: 450,
    originalCurrency: 'USD',
    cashbackMinor: 9,
    cashbackCurrency: 'USD',
    categoryRaw: '5411 - Grocery Stores and Supermarkets',
    spendingMode: 'Direct Pay',
    ...overrides,
  }
}

describe('commitImport', () => {
  it('adds new transactions and creates cards as needed', async () => {
    const rows = [makeRow(), makeRow({ description: 'Bookstore', amountMinor: 1200 })]

    const result = await commitImport(rows, {
      fileHash: 'hash-1',
      parserVersion: '1',
      unsupportedCount: 2,
    })

    expect(result.rowCounts).toEqual({ added: 2, updated: 0, unsupported: 2 })
    expect(await db.transactions.count()).toBe(2)
    expect(await db.cards.count()).toBe(1) // both rows share the same card identity
    const [importRecord] = await db.imports.toArray()
    expect(importRecord.id).toBe(result.importId)
  })

  it('updates an existing transaction in place on re-import instead of duplicating it', async () => {
    await commitImport([makeRow({ status: 'PENDING' })], {
      fileHash: 'hash-1',
      parserVersion: '1',
      unsupportedCount: 0,
    })

    const result = await commitImport([makeRow({ status: 'CLEARED', cashbackMinor: 12 })], {
      fileHash: 'hash-2',
      parserVersion: '1',
      unsupportedCount: 0,
    })

    expect(result.rowCounts).toEqual({ added: 0, updated: 1, unsupported: 0 })
    const transactions = await db.transactions.toArray()
    expect(transactions).toHaveLength(1)
    expect(transactions[0].status).toBe('CLEARED')
    expect(transactions[0].cashbackMinor).toBe(12)
  })

  it('never downgrades a CLEARED transaction, or its cashback, on a later stale re-import', async () => {
    await commitImport(
      [makeRow({ status: 'CLEARED', cashbackMinor: 12, cashbackCurrency: 'USD' })],
      { fileHash: 'hash-1', parserVersion: '1', unsupportedCount: 0 },
    )

    await commitImport(
      [makeRow({ status: 'PENDING', cashbackMinor: 0, cashbackCurrency: 'EUR' })],
      { fileHash: 'hash-2', parserVersion: '1', unsupportedCount: 0 },
    )

    const [transaction] = await db.transactions.toArray()
    expect(transaction.status).toBe('CLEARED')
    expect(transaction.cashbackMinor).toBe(12)
    expect(transaction.cashbackCurrency).toBe('USD')
  })

  it('rolls back every write (cards, transactions, import record) if the final commit step fails', async () => {
    const rows = [
      makeRow({ description: 'Coffee Shop' }),
      makeRow({ description: 'Bookstore', last4: '0000', cardHolderKey: 'someone else' }),
    ]

    vi.spyOn(db.imports, 'put').mockImplementation(() => {
      throw new Error('simulated failure')
    })

    await expect(
      commitImport(rows, { fileHash: 'hash-1', parserVersion: '1', unsupportedCount: 0 }),
    ).rejects.toThrow('simulated failure')

    expect(await db.transactions.count()).toBe(0)
    expect(await db.cards.count()).toBe(0)
    expect(await db.imports.count()).toBe(0)
  })

  it('keeps concurrent imports of unrelated rows from losing data', async () => {
    const rowsA = [makeRow({ description: 'Coffee Shop' })]
    const rowsB = [
      makeRow({ description: 'Bookstore', last4: '0000', cardHolderKey: 'someone else' }),
    ]

    const [resultA, resultB] = await Promise.all([
      commitImport(rowsA, { fileHash: 'hash-a', parserVersion: '1', unsupportedCount: 0 }),
      commitImport(rowsB, { fileHash: 'hash-b', parserVersion: '1', unsupportedCount: 0 }),
    ])

    expect(resultA.rowCounts).toEqual({ added: 1, updated: 0, unsupported: 0 })
    expect(resultB.rowCounts).toEqual({ added: 1, updated: 0, unsupported: 0 })
    expect(await db.transactions.count()).toBe(2)
    expect(await db.cards.count()).toBe(2)
    expect(await db.imports.count()).toBe(2)
  })

  it('does not duplicate a transaction when two concurrent imports report the same identity', async () => {
    const rows = [makeRow({ status: 'PENDING' })]
    const rowsUpdated = [makeRow({ status: 'CLEARED', cashbackMinor: 12 })]

    await Promise.all([
      commitImport(rows, { fileHash: 'hash-a', parserVersion: '1', unsupportedCount: 0 }),
      commitImport(rowsUpdated, { fileHash: 'hash-b', parserVersion: '1', unsupportedCount: 0 }),
    ])

    expect(await db.transactions.count()).toBe(1)
    expect(await db.cards.count()).toBe(1)
    expect(await db.imports.count()).toBe(2)
  })
})
