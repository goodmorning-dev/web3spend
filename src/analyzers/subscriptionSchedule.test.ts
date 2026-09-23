import { describe, expect, it } from 'vitest'
import type { StandardTransaction } from '@/types/transaction'
import {
  averageMonthlySpend,
  daysUntil,
  isRecentlyCharged,
  nextChargeDate,
  recentMonths,
} from './subscriptionSchedule'
import type { SubscriptionGroup } from './subscriptions'

function makeGroup(timestamps: string[], dayOfMonth = 15): SubscriptionGroup {
  return {
    description: 'Netflix',
    currency: 'EUR',
    amountMinor: 1399,
    cardId: 'card-1',
    dayOfMonth,
    categoryRaw: 'Digital Goods: Media, Books, Music',
    occurrences: timestamps.map((timestampUtc, index) => ({
      transactionId: `txn-${index}`,
      timestampUtc,
      cardId: 'card-1',
      monthKey: timestampUtc.slice(0, 7),
    })),
  }
}

function makeTransaction(overrides: Partial<StandardTransaction> = {}): StandardTransaction {
  return {
    id: 'txn-1',
    cardId: 'card-1',
    timestampUtc: '2026-01-15T10:00:00.000Z',
    type: 'card_spend',
    description: 'Coffee Shop',
    status: 'CLEARED',
    amountMinor: 1000,
    currency: 'EUR',
    originalAmountMinor: 1000,
    originalCurrency: 'EUR',
    cashbackMinor: 25,
    cashbackCurrency: 'EUR',
    categoryRaw: 'Groceries',
    spendingMode: 'Direct Pay',
    identityKey: 'key-1',
    importId: 'import-1',
    ...overrides,
  }
}

describe('isRecentlyCharged', () => {
  const group = makeGroup(['2026-07-15T10:00:00.000Z', '2026-08-15T10:00:00.000Z'])

  it('is true while the latest charge is within the last 35 days of data', () => {
    expect(isRecentlyCharged(group, '2026-09-10T00:00:00.000Z')).toBe(true)
    expect(isRecentlyCharged(group, '2026-09-19T10:00:00.000Z')).toBe(true)
  })

  it('is false once a whole month has gone by without a charge', () => {
    expect(isRecentlyCharged(group, '2026-09-20T10:00:00.000Z')).toBe(false)
  })
})

describe('nextChargeDate', () => {
  const group = makeGroup(['2026-07-15T10:00:00.000Z', '2026-08-15T10:00:00.000Z'])

  it('is later this month when the usual day is still ahead', () => {
    expect(nextChargeDate(group, new Date('2026-09-03T18:00:00.000Z')).toISOString()).toBe(
      '2026-09-15T00:00:00.000Z',
    )
  })

  it("is today when today is the usual day and it hasn't charged yet", () => {
    expect(nextChargeDate(group, new Date('2026-09-15T08:00:00.000Z')).toISOString()).toBe(
      '2026-09-15T00:00:00.000Z',
    )
  })

  it("moves to next month once this month's charge is already in", () => {
    const chargedToday = makeGroup(['2026-08-15T10:00:00.000Z', '2026-09-15T10:00:00.000Z'])
    expect(nextChargeDate(chargedToday, new Date('2026-09-15T20:00:00.000Z')).toISOString()).toBe(
      '2026-10-15T00:00:00.000Z',
    )
  })

  it('moves to next month once the usual day has passed', () => {
    expect(nextChargeDate(group, new Date('2026-09-20T12:00:00.000Z')).toISOString()).toBe(
      '2026-10-15T00:00:00.000Z',
    )
  })

  it("lands on the month's last day when the month is too short for the usual day", () => {
    const endOfMonth = makeGroup(['2026-07-31T10:00:00.000Z', '2026-08-31T10:00:00.000Z'], 31)
    expect(nextChargeDate(endOfMonth, new Date('2026-09-10T12:00:00.000Z')).toISOString()).toBe(
      '2026-09-30T00:00:00.000Z',
    )
  })

  it('rolls over into the next year', () => {
    const december = makeGroup(['2026-11-20T10:00:00.000Z', '2026-12-20T10:00:00.000Z'], 20)
    expect(nextChargeDate(december, new Date('2026-12-28T12:00:00.000Z')).toISOString()).toBe(
      '2027-01-20T00:00:00.000Z',
    )
  })
})

describe('daysUntil', () => {
  it('counts whole UTC days, whatever the time of day', () => {
    const date = new Date('2026-09-24T00:00:00.000Z')
    expect(daysUntil(date, new Date('2026-09-24T23:59:00.000Z'))).toBe(0)
    expect(daysUntil(date, new Date('2026-09-23T00:01:00.000Z'))).toBe(1)
    expect(daysUntil(date, new Date('2026-09-14T12:00:00.000Z'))).toBe(10)
  })
})

describe('recentMonths', () => {
  it('lists the last 12 months up to the one the data ends in, oldest first', () => {
    const group = makeGroup(['2025-11-15T10:00:00.000Z', '2026-01-15T10:00:00.000Z'])
    const months = recentMonths(group, '2026-02-03T10:00:00.000Z')

    expect(months).toHaveLength(12)
    expect(months[0]).toEqual({ year: 2025, month: 3, charged: false })
    expect(months[11]).toEqual({ year: 2026, month: 2, charged: false })
    expect(months.filter((month) => month.charged)).toEqual([
      { year: 2025, month: 11, charged: true },
      { year: 2026, month: 1, charged: true },
    ])
  })
})

describe('averageMonthlySpend', () => {
  it('averages cleared spend over the last 3 full months, leaving out the one in progress', () => {
    const average = averageMonthlySpend(
      [
        makeTransaction({ id: '1', timestampUtc: '2026-05-10T10:00:00.000Z', amountMinor: 9000 }),
        makeTransaction({ id: '2', timestampUtc: '2026-06-10T10:00:00.000Z', amountMinor: 1000 }),
        makeTransaction({ id: '3', timestampUtc: '2026-07-10T10:00:00.000Z', amountMinor: 2000 }),
        makeTransaction({ id: '4', timestampUtc: '2026-08-10T10:00:00.000Z', amountMinor: 3000 }),
        makeTransaction({ id: '5', timestampUtc: '2026-09-02T10:00:00.000Z', amountMinor: 50000 }),
      ],
      '2026-09-02T10:00:00.000Z',
    )

    expect(average).toEqual({
      averageMinor: 2000,
      from: { year: 2026, month: 6 },
      to: { year: 2026, month: 8 },
    })
  })

  it('only counts cleared purchases toward the total', () => {
    const average = averageMonthlySpend(
      [
        makeTransaction({ id: '1', timestampUtc: '2026-08-01T10:00:00.000Z', amountMinor: 1000 }),
        makeTransaction({
          id: '2',
          timestampUtc: '2026-08-02T10:00:00.000Z',
          amountMinor: 5000,
          status: 'CANCELLED',
        }),
        makeTransaction({ id: '3', timestampUtc: '2026-08-03T10:00:00.000Z', amountMinor: -1000 }),
      ],
      '2026-09-02T10:00:00.000Z',
    )

    expect(average?.averageMinor).toBe(1000)
  })

  it('skips months with no transactions at all rather than averaging in a zero', () => {
    const average = averageMonthlySpend(
      [
        makeTransaction({ id: '1', timestampUtc: '2026-03-10T10:00:00.000Z', amountMinor: 1000 }),
        makeTransaction({ id: '2', timestampUtc: '2026-08-10T10:00:00.000Z', amountMinor: 3000 }),
      ],
      '2026-09-02T10:00:00.000Z',
    )

    expect(average).toEqual({
      averageMinor: 2000,
      from: { year: 2026, month: 3 },
      to: { year: 2026, month: 8 },
    })
  })

  it('is null when there is no full month on record yet', () => {
    expect(
      averageMonthlySpend(
        [makeTransaction({ timestampUtc: '2026-09-01T10:00:00.000Z' })],
        '2026-09-02T10:00:00.000Z',
      ),
    ).toBeNull()
  })
})
