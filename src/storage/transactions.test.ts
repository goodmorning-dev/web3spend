import { afterEach, describe, expect, it } from 'vitest'
import {
  bulkPutTransactions,
  findTransactionByIdentityKey,
  getTransaction,
  listTransactions,
  putTransaction,
} from './transactions'
import { resetDatabase } from './test-helpers'
import type { StandardTransaction } from '@/types/transaction'

afterEach(resetDatabase)

function makeTransaction(overrides: Partial<StandardTransaction> = {}): StandardTransaction {
  return {
    id: 'txn-1',
    cardId: 'card-1',
    timestampUtc: '2026-01-15T10:00:00.000Z',
    type: 'card_spend',
    description: 'Coffee Shop',
    status: 'CLEARED',
    amountMinor: 450,
    currency: 'USD',
    originalAmountMinor: 450,
    originalCurrency: 'USD',
    cashbackMinor: 9,
    cashbackCurrency: 'USD',
    categoryRaw: '5411 - Grocery Stores and Supermarkets',
    spendingMode: 'Direct Pay',
    identityKey: 'identity-1',
    importId: 'import-1',
    ...overrides,
  }
}

describe('transactions repository', () => {
  it('round-trips a transaction by id', async () => {
    const transaction = makeTransaction()
    await putTransaction(transaction)

    expect(await getTransaction(transaction.id)).toEqual(transaction)
    expect(await listTransactions()).toEqual([transaction])
  })

  it('finds a transaction by identityKey', async () => {
    const transaction = makeTransaction()
    await putTransaction(transaction)

    expect(await findTransactionByIdentityKey('identity-1')).toEqual(transaction)
    expect(await findTransactionByIdentityKey('does-not-exist')).toBeUndefined()
  })

  it('an upsert (put) with the same id replaces the existing row instead of duplicating it', async () => {
    const original = makeTransaction({ status: 'PENDING' })
    await putTransaction(original)

    const updated = makeTransaction({ status: 'CLEARED' })
    await putTransaction(updated)

    expect(await listTransactions()).toEqual([updated])
  })

  it('bulk-inserts multiple transactions', async () => {
    const first = makeTransaction({ id: 'txn-1', identityKey: 'identity-1' })
    const second = makeTransaction({ id: 'txn-2', identityKey: 'identity-2' })
    await bulkPutTransactions([first, second])

    const all = await listTransactions()
    expect(all).toHaveLength(2)
    expect(all.map((t) => t.id).sort()).toEqual(['txn-1', 'txn-2'])
  })
})
