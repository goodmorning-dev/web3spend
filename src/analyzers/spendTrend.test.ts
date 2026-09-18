import { afterEach, describe, expect, it, vi } from 'vitest'
import type { StandardTransaction } from '@/types/transaction'
import { computeSpendTrend } from './spendTrend'

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

describe('computeSpendTrend', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns one point per day of the selected month', () => {
    const result = computeSpendTrend([], 2026, 2) // February 2026: 28 days
    expect(result).toHaveLength(28)
    expect(result[0].day).toBe(1)
    expect(result[27].day).toBe(28)
  })

  it('only fills in "this month" up to today when the selected month is the current one', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-03-16T12:00:00.000Z'))

    const result = computeSpendTrend(
      [
        makeTransaction({ id: '1', timestampUtc: '2026-03-01T00:00:00.000Z', amountMinor: 1000 }),
        makeTransaction({ id: '2', timestampUtc: '2026-03-10T00:00:00.000Z', amountMinor: 500 }),
      ],
      2026,
      3,
    )

    expect(result[0].thisMonthMinor).toBe(1000) // day 1
    expect(result[9].thisMonthMinor).toBe(1500) // day 10, cumulative
    expect(result[15].thisMonthMinor).toBe(1500) // day 16 (today): still known
    expect(result[16].thisMonthMinor).toBeNull() // day 17: not yet happened
  })

  it('fills in the whole "this month" curve when the selected month is fully in the past', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-06-01T00:00:00.000Z'))

    const result = computeSpendTrend(
      [makeTransaction({ timestampUtc: '2026-03-31T00:00:00.000Z', amountMinor: 1000 })],
      2026,
      3,
    )

    expect(result.every((point) => point.thisMonthMinor !== null)).toBe(true)
    expect(result[30].thisMonthMinor).toBe(1000) // March 31
  })

  it("computes last month's cumulative curve from the prior calendar month, handling year rollover", () => {
    const result = computeSpendTrend(
      [
        makeTransaction({ id: '1', timestampUtc: '2025-12-05T00:00:00.000Z', amountMinor: 2000 }),
        makeTransaction({ id: '2', timestampUtc: '2025-12-20T00:00:00.000Z', amountMinor: 1000 }),
      ],
      2026,
      1,
    )

    expect(result[4].lastMonthMinor).toBe(2000) // Dec 5
    expect(result[19].lastMonthMinor).toBe(3000) // Dec 20
    expect(result[30].lastMonthMinor).toBe(3000) // Dec 31, holds flat
  })

  it("holds last month's total flat past its own (shorter) length", () => {
    // February only has 28 days in 2026; March has 31
    const result = computeSpendTrend(
      [makeTransaction({ timestampUtc: '2026-02-10T00:00:00.000Z', amountMinor: 800 })],
      2026,
      3,
    )

    expect(result[29].lastMonthMinor).toBe(800) // March 30, past Feb's end
  })

  it('averages every other month on record, excluding the selected month itself', () => {
    const result = computeSpendTrend(
      [
        makeTransaction({ id: '1', timestampUtc: '2026-01-05T00:00:00.000Z', amountMinor: 1000 }),
        makeTransaction({ id: '2', timestampUtc: '2026-02-05T00:00:00.000Z', amountMinor: 3000 }),
        // this is the selected month; it must not feed its own average
        makeTransaction({ id: '3', timestampUtc: '2026-03-05T00:00:00.000Z', amountMinor: 9000 }),
      ],
      2026,
      3,
    )

    expect(result[4].averageMonthlyMinor).toBe(2000) // (1000 + 3000) / 2
  })

  it('averages to 0 when no other month has data yet', () => {
    const result = computeSpendTrend(
      [makeTransaction({ timestampUtc: '2026-03-05T00:00:00.000Z', amountMinor: 9000 })],
      2026,
      3,
    )

    expect(result.every((point) => point.averageMonthlyMinor === 0)).toBe(true)
  })
})
