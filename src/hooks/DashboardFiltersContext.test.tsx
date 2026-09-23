import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { db } from '@/storage/db'
import { resetDatabase } from '@/storage/test-helpers'
import type { StandardTransaction } from '@/types/transaction'
import { DashboardFiltersProvider, useDashboardFilters } from './DashboardFiltersContext'

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

function renderWithProvider() {
  return renderHook(() => useDashboardFilters(), {
    wrapper: ({ children }) => <DashboardFiltersProvider>{children}</DashboardFiltersProvider>,
  })
}

describe('useDashboardFilters', () => {
  it('throws when used outside a DashboardFiltersProvider', () => {
    expect(() => renderHook(() => useDashboardFilters())).toThrow(
      /must be used within a DashboardFiltersProvider/,
    )
  })

  it('has no filters (null) when there is no data yet', async () => {
    const { result } = renderWithProvider()
    await waitFor(() => expect(result.current.options).toBeDefined())
    expect(result.current.filters).toBeNull()
  })

  it('defaults to the first currency and the most recent period once data exists', async () => {
    await db.transactions.bulkPut([
      makeTransaction({ id: '1', currency: 'EUR', timestampUtc: '2026-01-01T00:00:00.000Z' }),
      makeTransaction({ id: '2', currency: 'USD', timestampUtc: '2026-03-01T00:00:00.000Z' }),
    ])

    const { result } = renderWithProvider()
    await waitFor(() => expect(result.current.filters).not.toBeNull())

    expect(result.current.filters).toEqual({
      currency: 'EUR',
      cardId: undefined,
      period: { kind: 'month', year: 2026, month: 3 },
    })
  })

  it('applies setCurrency, setCardId, and setPeriod on top of the defaults', async () => {
    await db.transactions.put(
      makeTransaction({ currency: 'EUR', timestampUtc: '2026-03-01T00:00:00.000Z' }),
    )
    await db.cards.put({ id: 'card-1', last4: '1234', cardHolderKey: 'jane doe', label: 'Card' })

    const { result } = renderWithProvider()
    await waitFor(() => expect(result.current.filters).not.toBeNull())

    act(() => result.current.setCurrency('USD'))
    expect(result.current.filters?.currency).toBe('USD')

    act(() => result.current.setCardId('card-1'))
    expect(result.current.filters?.cardId).toBe('card-1')

    act(() => result.current.setPeriod({ kind: 'month', year: 2025, month: 6 }))
    expect(result.current.filters?.period).toEqual({ kind: 'month', year: 2025, month: 6 })
  })

  it('sets year, month, and day together via setDay, even for a month other than the current period', async () => {
    await db.transactions.put(
      makeTransaction({ currency: 'EUR', timestampUtc: '2026-03-01T00:00:00.000Z' }),
    )

    const { result } = renderWithProvider()
    await waitFor(() => expect(result.current.filters).not.toBeNull())
    expect(result.current.filters?.period).toEqual({ kind: 'month', year: 2026, month: 3 })

    act(() => result.current.setDay(2026, 7, 15))

    expect(result.current.filters?.period).toEqual({ kind: 'month', year: 2026, month: 7, day: 15 })
  })

  it('clears the day filter without disturbing the period it moved to', async () => {
    await db.transactions.put(
      makeTransaction({ currency: 'EUR', timestampUtc: '2026-03-01T00:00:00.000Z' }),
    )

    const { result } = renderWithProvider()
    await waitFor(() => expect(result.current.filters).not.toBeNull())

    act(() => result.current.setDay(2026, 7, 15))
    act(() => result.current.clearDay())

    expect(result.current.filters?.period).toEqual({ kind: 'month', year: 2026, month: 7 })
  })

  it('clears an existing day filter when the period is changed directly', async () => {
    await db.transactions.put(
      makeTransaction({ currency: 'EUR', timestampUtc: '2026-03-01T00:00:00.000Z' }),
    )

    const { result } = renderWithProvider()
    await waitFor(() => expect(result.current.filters).not.toBeNull())

    act(() => result.current.setDay(2026, 3, 15))
    expect(result.current.filters?.period).toMatchObject({ day: 15 })

    act(() => result.current.setPeriod({ kind: 'month', year: 2026, month: 4 }))
    expect(result.current.filters?.period).toEqual({ kind: 'month', year: 2026, month: 4 })
  })

  it('switches to all time, and clearDay leaves it alone', async () => {
    await db.transactions.put(
      makeTransaction({ currency: 'EUR', timestampUtc: '2026-03-01T00:00:00.000Z' }),
    )

    const { result } = renderWithProvider()
    await waitFor(() => expect(result.current.filters).not.toBeNull())

    act(() => result.current.setPeriod({ kind: 'all' }))
    act(() => result.current.clearDay())
    expect(result.current.filters?.period).toEqual({ kind: 'all' })
  })

  it('resetFilters clears a stale card override so data re-imported with new IDs is not silently hidden', async () => {
    // reproduces: select a card, delete all data, re-import (which assigns
    // fresh card IDs) - without a reset, the old card's ID lingers as an
    // override and filters out every newly imported transaction, since
    // none of them belong to a card ID that exists anymore.
    await db.cards.put({
      id: 'card-old',
      last4: '1234',
      cardHolderKey: 'jane doe',
      label: 'Old Card',
    })
    await db.transactions.put(
      makeTransaction({
        cardId: 'card-old',
        currency: 'EUR',
        timestampUtc: '2026-03-01T00:00:00.000Z',
      }),
    )

    const { result } = renderWithProvider()
    await waitFor(() => expect(result.current.filters).not.toBeNull())

    act(() => result.current.setCardId('card-old'))
    expect(result.current.filters?.cardId).toBe('card-old')

    // simulate "delete everything, then re-import": the old card and its
    // transaction are gone, replaced by a transaction under a brand new
    // card ID, exactly as a fresh import would produce
    await resetDatabase()
    await db.cards.put({
      id: 'card-new',
      last4: '5678',
      cardHolderKey: 'jane doe',
      label: 'New Card',
    })
    await db.transactions.put(
      makeTransaction({
        id: 'txn-2',
        cardId: 'card-new',
        currency: 'EUR',
        timestampUtc: '2026-04-01T00:00:00.000Z',
      }),
    )

    act(() => result.current.resetFilters())

    // a longer timeout than the default: this waits on the same live query
    // resolving twice in a row (once for the reset-to-empty-data state,
    // once for the re-imported data), which can occasionally take a beat
    // longer than 1s under a loaded test run.
    await waitFor(
      () => {
        expect(result.current.filters).toMatchObject({
          currency: 'EUR',
          period: { kind: 'month', year: 2026, month: 4 },
        })
        expect(result.current.filters?.cardId).toBeUndefined()
      },
      { timeout: 3000 },
    )
  })
})
