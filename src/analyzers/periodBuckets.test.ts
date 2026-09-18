import { describe, expect, it } from 'vitest'
import type { StandardTransaction } from '@/types/transaction'
import { bucketByDay, bucketByMonth } from './periodBuckets'

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

describe('bucketByDay', () => {
  it('returns one bucket per day of the month, including zero-spend days', () => {
    const result = bucketByDay([], 2026, 2) // February 2026: 28 days
    expect(result).toHaveLength(28)
    expect(result[0]).toEqual({
      key: '2026-02-01',
      spendMinor: 0,
      cashbackMinor: 0,
      effectiveCashbackPct: null,
    })
  })

  it("sums same-day transactions and computes that day's effective rate", () => {
    const result = bucketByDay(
      [
        makeTransaction({
          id: '1',
          timestampUtc: '2026-01-05T08:00:00.000Z',
          amountMinor: 1000,
          cashbackMinor: 30,
        }),
        makeTransaction({
          id: '2',
          timestampUtc: '2026-01-05T20:00:00.000Z',
          amountMinor: 2000,
          cashbackMinor: 20,
        }),
      ],
      2026,
      1,
    )

    const day5 = result.find((bucket) => bucket.key === '2026-01-05')
    expect(day5).toEqual({
      key: '2026-01-05',
      spendMinor: 3000,
      cashbackMinor: 50,
      effectiveCashbackPct: (50 / 3000) * 100,
    })
  })

  it('assigns a transaction to its UTC day, not a locally-shifted one', () => {
    // 23:30 UTC on Jan 31 must land in the Jan 31 bucket
    const result = bucketByDay(
      [makeTransaction({ timestampUtc: '2026-01-31T23:30:00.000Z', amountMinor: 500 })],
      2026,
      1,
    )
    const day31 = result.find((bucket) => bucket.key === '2026-01-31')
    expect(day31?.spendMinor).toBe(500)
  })

  it('excludes non-cleared rows', () => {
    const result = bucketByDay([makeTransaction({ status: 'PENDING', amountMinor: 999 })], 2026, 1)
    expect(result.every((bucket) => bucket.spendMinor === 0)).toBe(true)
  })

  it('excludes a refund-like row (negative amount) from its day instead of subtracting it', () => {
    const result = bucketByDay(
      [
        makeTransaction({ id: '1', timestampUtc: '2026-01-05T08:00:00.000Z', amountMinor: 1000 }),
        makeTransaction({
          id: '2',
          timestampUtc: '2026-01-05T20:00:00.000Z',
          amountMinor: -400,
        }),
      ],
      2026,
      1,
    )

    const day5 = result.find((bucket) => bucket.key === '2026-01-05')
    expect(day5?.spendMinor).toBe(1000)
  })

  it("reports a day's rate as unavailable, not a mixed-currency figure, when its cashback currencies differ", () => {
    const result = bucketByDay(
      [
        makeTransaction({
          id: '1',
          timestampUtc: '2026-01-05T08:00:00.000Z',
          currency: 'EUR',
          cashbackCurrency: 'EUR',
          cashbackMinor: 20,
        }),
        makeTransaction({
          id: '2',
          timestampUtc: '2026-01-05T20:00:00.000Z',
          currency: 'EUR',
          cashbackCurrency: 'USD',
          cashbackMinor: 30,
        }),
      ],
      2026,
      1,
    )

    const day5 = result.find((bucket) => bucket.key === '2026-01-05')
    expect(day5?.effectiveCashbackPct).toBeNull()
    expect(day5?.cashbackMinor).toBe(20)
  })
})

describe('bucketByMonth', () => {
  it('returns one bucket per month of the year, including zero-spend months', () => {
    const result = bucketByMonth([], 2026)
    expect(result).toHaveLength(12)
    expect(result[0].key).toBe('2026-01')
    expect(result[11].key).toBe('2026-12')
  })

  it('sums same-month transactions regardless of day', () => {
    const result = bucketByMonth(
      [
        makeTransaction({
          id: '1',
          timestampUtc: '2026-03-01T00:00:00.000Z',
          amountMinor: 1000,
          cashbackMinor: 10,
        }),
        makeTransaction({
          id: '2',
          timestampUtc: '2026-03-31T00:00:00.000Z',
          amountMinor: 2000,
          cashbackMinor: 20,
        }),
      ],
      2026,
    )

    const march = result.find((bucket) => bucket.key === '2026-03')
    expect(march).toEqual({
      key: '2026-03',
      spendMinor: 3000,
      cashbackMinor: 30,
      effectiveCashbackPct: (30 / 3000) * 100,
    })
  })

  it('excludes a refund-like row (negative amount) from its month instead of subtracting it', () => {
    const result = bucketByMonth(
      [
        makeTransaction({ id: '1', timestampUtc: '2026-03-01T00:00:00.000Z', amountMinor: 1000 }),
        makeTransaction({ id: '2', timestampUtc: '2026-03-31T00:00:00.000Z', amountMinor: -400 }),
      ],
      2026,
    )

    const march = result.find((bucket) => bucket.key === '2026-03')
    expect(march?.spendMinor).toBe(1000)
  })

  it("reports a month's rate as unavailable, without affecting a different month, when its cashback currencies differ", () => {
    const result = bucketByMonth(
      [
        makeTransaction({
          id: '1',
          timestampUtc: '2026-03-01T00:00:00.000Z',
          currency: 'EUR',
          cashbackCurrency: 'EUR',
          cashbackMinor: 20,
        }),
        makeTransaction({
          id: '2',
          timestampUtc: '2026-03-31T00:00:00.000Z',
          currency: 'EUR',
          cashbackCurrency: 'USD',
          cashbackMinor: 30,
        }),
        makeTransaction({
          id: '3',
          timestampUtc: '2026-04-01T00:00:00.000Z',
          currency: 'EUR',
          cashbackCurrency: 'EUR',
          amountMinor: 1000,
          cashbackMinor: 25,
        }),
      ],
      2026,
    )

    const march = result.find((bucket) => bucket.key === '2026-03')
    const april = result.find((bucket) => bucket.key === '2026-04')
    expect(march?.effectiveCashbackPct).toBeNull()
    expect(march?.cashbackMinor).toBe(20)
    expect(april?.effectiveCashbackPct).toBe((25 / 1000) * 100)
  })
})
