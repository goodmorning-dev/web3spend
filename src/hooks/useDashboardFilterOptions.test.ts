import { renderHook, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { db } from '@/storage/db'
import { resetDatabase } from '@/storage/test-helpers'
import type { StandardTransaction } from '@/types/transaction'
import { useDashboardFilterOptions } from './useDashboardFilterOptions'

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

describe('useDashboardFilterOptions', () => {
  it('reports no cards, currencies, or periods when there is no data', async () => {
    const { result } = renderHook(() => useDashboardFilterOptions())

    await waitFor(() => expect(result.current).toBeDefined())
    expect(result.current).toEqual({ cards: [], currencies: [], periods: [] })
  })

  it('lists distinct currencies, sorted', async () => {
    await db.transactions.bulkPut([
      makeTransaction({ id: '1', currency: 'USD' }),
      makeTransaction({ id: '2', currency: 'EUR' }),
      makeTransaction({ id: '3', currency: 'EUR' }),
    ])

    const { result } = renderHook(() => useDashboardFilterOptions())
    await waitFor(() => expect(result.current).toBeDefined())

    expect(result.current?.currencies).toEqual(['EUR', 'USD'])
  })

  it('lists distinct (year, month) periods present in the data, most recent first', async () => {
    await db.transactions.bulkPut([
      makeTransaction({ id: '1', timestampUtc: '2026-01-05T00:00:00.000Z' }),
      makeTransaction({ id: '2', timestampUtc: '2026-03-20T00:00:00.000Z' }),
      makeTransaction({ id: '3', timestampUtc: '2026-03-21T00:00:00.000Z' }), // same period as #2
      makeTransaction({ id: '4', timestampUtc: '2025-12-01T00:00:00.000Z' }),
    ])

    const { result } = renderHook(() => useDashboardFilterOptions())
    await waitFor(() => expect(result.current).toBeDefined())

    expect(result.current?.periods).toEqual([
      { year: 2026, month: 3 },
      { year: 2026, month: 1 },
      { year: 2025, month: 12 },
    ])
  })

  it('lists cards from storage', async () => {
    await db.cards.put({ id: 'card-1', last4: '1234', cardHolderKey: 'jane doe', label: 'Card' })

    const { result } = renderHook(() => useDashboardFilterOptions())
    await waitFor(() => expect(result.current).toBeDefined())

    expect(result.current?.cards).toHaveLength(1)
    expect(result.current?.cards[0].id).toBe('card-1')
  })
})
