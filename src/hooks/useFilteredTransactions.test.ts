import { renderHook, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { db } from '@/storage/db'
import { resetDatabase } from '@/storage/test-helpers'
import type { StandardTransaction } from '@/types/transaction'
import { useFilteredTransactions } from './useFilteredTransactions'

afterEach(resetDatabase)

function makeTransaction(overrides: Partial<StandardTransaction> = {}): StandardTransaction {
  return {
    id: 'txn-1',
    cardId: 'card-1',
    timestampUtc: '2026-03-15T10:00:00.000Z',
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
    ...overrides,
  }
}

describe('useFilteredTransactions', () => {
  it('stays undefined (loading) when there are no filters yet', async () => {
    const { result } = renderHook(() => useFilteredTransactions(null))
    await waitFor(() => expect(result.current).toBeUndefined())
  })

  it('returns only the transactions matching the given filters', async () => {
    await db.transactions.bulkPut([
      makeTransaction({ id: '1', currency: 'EUR', timestampUtc: '2026-03-01T00:00:00.000Z' }),
      makeTransaction({ id: '2', currency: 'USD', timestampUtc: '2026-03-01T00:00:00.000Z' }),
      makeTransaction({ id: '3', currency: 'EUR', timestampUtc: '2026-04-01T00:00:00.000Z' }),
    ])

    const { result } = renderHook(() =>
      useFilteredTransactions({
        currency: 'EUR',
        period: { kind: 'month', year: 2026, month: 3 },
      }),
    )

    await waitFor(() => expect(result.current).toHaveLength(1))
    expect(result.current?.[0].id).toBe('1')
  })

  it('returns everything in the currency for "All time", across years', async () => {
    await db.transactions.bulkPut([
      makeTransaction({ id: '1', currency: 'EUR', timestampUtc: '2025-11-01T00:00:00.000Z' }),
      makeTransaction({ id: '2', currency: 'EUR', timestampUtc: '2026-03-01T00:00:00.000Z' }),
      makeTransaction({ id: '3', currency: 'USD', timestampUtc: '2026-03-01T00:00:00.000Z' }),
    ])

    const { result } = renderHook(() =>
      useFilteredTransactions({ currency: 'EUR', period: { kind: 'all' } }),
    )

    await waitFor(() => expect(result.current).toHaveLength(2))
    expect(result.current?.map((transaction) => transaction.id).sort()).toEqual(['1', '2'])
  })
})
