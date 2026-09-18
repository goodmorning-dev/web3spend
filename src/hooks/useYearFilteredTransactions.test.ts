import { renderHook, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { db } from '@/storage/db'
import { resetDatabase } from '@/storage/test-helpers'
import type { StandardTransaction } from '@/types/transaction'
import { useYearFilteredTransactions } from './useYearFilteredTransactions'

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

describe('useYearFilteredTransactions', () => {
  it('stays undefined (loading) when there are no filters yet', async () => {
    const { result } = renderHook(() => useYearFilteredTransactions(null))
    await waitFor(() => expect(result.current).toBeUndefined())
  })

  it('includes every month of the selected year, unlike the month-scoped hook', async () => {
    await db.transactions.bulkPut([
      makeTransaction({ id: '1', currency: 'EUR', timestampUtc: '2026-01-05T00:00:00.000Z' }),
      makeTransaction({ id: '2', currency: 'EUR', timestampUtc: '2026-06-20T00:00:00.000Z' }),
      makeTransaction({ id: '3', currency: 'USD', timestampUtc: '2026-06-20T00:00:00.000Z' }),
      makeTransaction({ id: '4', currency: 'EUR', timestampUtc: '2025-12-31T00:00:00.000Z' }),
    ])

    const { result } = renderHook(() =>
      useYearFilteredTransactions({ currency: 'EUR', year: 2026, month: 6 }),
    )

    await waitFor(() => expect(result.current).toHaveLength(2))
    expect(result.current?.map((transaction) => transaction.id).sort()).toEqual(['1', '2'])
  })
})
