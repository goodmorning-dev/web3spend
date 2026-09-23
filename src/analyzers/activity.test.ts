import { describe, expect, it } from 'vitest'
import type { StandardTransaction } from '@/types/transaction'
import { computeYearActivity, summarizeYearActivity } from './activity'

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

describe('computeYearActivity', () => {
  it('returns one entry per day of the year, all level 0, when there is no spend', () => {
    const result = computeYearActivity([], 2026)
    expect(result).toHaveLength(365)
    expect(result.every((day) => day.level === 0 && day.spendMinor === 0)).toBe(true)
    expect(result[0].key).toBe('2026-01-01')
    expect(result[364].key).toBe('2026-12-31')
  })

  it('accounts for the extra day in a leap year', () => {
    expect(computeYearActivity([], 2024)).toHaveLength(366)
  })

  it('assigns a transaction to its UTC day, not a locally-shifted one', () => {
    const result = computeYearActivity(
      [makeTransaction({ timestampUtc: '2026-01-31T23:30:00.000Z', amountMinor: 500 })],
      2026,
    )
    const day = result.find((entry) => entry.key === '2026-01-31')
    expect(day?.spendMinor).toBe(500)
  })

  it('excludes non-cleared rows', () => {
    const result = computeYearActivity(
      [makeTransaction({ status: 'PENDING', amountMinor: 999 })],
      2026,
    )
    expect(result.every((day) => day.spendMinor === 0 && day.level === 0)).toBe(true)
  })

  it('gives the single spending day in the year a non-zero level', () => {
    const result = computeYearActivity(
      [makeTransaction({ timestampUtc: '2026-06-01T00:00:00.000Z', amountMinor: 500 })],
      2026,
    )
    const day = result.find((entry) => entry.key === '2026-06-01')
    expect(day?.level).toBe(1)
  })

  it('spreads spending days across levels 1-4 by quantile, low spend to low level and high spend to high level', () => {
    const amounts = [10, 20, 30, 40, 50, 60, 70, 80]
    const transactions = amounts.map((amountMinor, index) =>
      makeTransaction({
        id: `txn-${index}`,
        timestampUtc: `2026-01-${String(index + 1).padStart(2, '0')}T00:00:00.000Z`,
        amountMinor,
      }),
    )

    const result = computeYearActivity(transactions, 2026)
    const levelByDay = new Map(
      result.filter((day) => day.spendMinor > 0).map((day) => [day.spendMinor, day.level]),
    )

    expect(levelByDay.get(10)).toBe(1)
    expect(levelByDay.get(80)).toBe(4)
    // strictly non-decreasing as spend increases
    const levels = amounts.map((amount) => levelByDay.get(amount)!)
    for (let i = 1; i < levels.length; i++) {
      expect(levels[i]).toBeGreaterThanOrEqual(levels[i - 1])
    }
  })

  it('gives every day the same level when all spending days are equal, rather than dividing by zero', () => {
    const transactions = [1, 2, 3].map((day) =>
      makeTransaction({
        id: `txn-${day}`,
        timestampUtc: `2026-02-0${day}T00:00:00.000Z`,
        amountMinor: 100,
      }),
    )

    const result = computeYearActivity(transactions, 2026)
    const spendingDays = result.filter((day) => day.spendMinor > 0)
    expect(spendingDays).toHaveLength(3)
    expect(spendingDays.every((day) => day.level === 1)).toBe(true)
  })

  it('throws if given transactions in more than one currency', () => {
    expect(() =>
      computeYearActivity(
        [makeTransaction({ currency: 'EUR' }), makeTransaction({ currency: 'USD' })],
        2026,
      ),
    ).toThrow()
  })

  it('excludes a refund-like row (negative amount) from its day instead of subtracting it', () => {
    const result = computeYearActivity(
      [
        makeTransaction({ id: '1', timestampUtc: '2026-06-01T08:00:00.000Z', amountMinor: 1000 }),
        makeTransaction({
          id: '2',
          timestampUtc: '2026-06-01T20:00:00.000Z',
          amountMinor: -400,
        }),
      ],
      2026,
    )

    const day = result.find((entry) => entry.key === '2026-06-01')
    expect(day?.spendMinor).toBe(1000)
  })

  it('counts the same cleared purchases per day that it adds up for spend', () => {
    const result = computeYearActivity(
      [
        makeTransaction({ id: '1', timestampUtc: '2026-06-01T08:00:00.000Z', amountMinor: 1000 }),
        makeTransaction({ id: '2', timestampUtc: '2026-06-01T12:00:00.000Z', amountMinor: 250 }),
        makeTransaction({ id: '3', timestampUtc: '2026-06-01T14:00:00.000Z', status: 'PENDING' }),
        makeTransaction({ id: '4', timestampUtc: '2026-06-01T16:00:00.000Z', status: 'CANCELLED' }),
        makeTransaction({ id: '5', timestampUtc: '2026-06-01T20:00:00.000Z', amountMinor: -400 }),
      ],
      2026,
    )

    const day = result.find((entry) => entry.key === '2026-06-01')
    expect(day).toMatchObject({ spendMinor: 1250, purchaseCount: 2 })
    expect(result.filter((entry) => entry.purchaseCount > 0)).toHaveLength(1)
  })

  it('shades the transaction view by how many purchases a day had, regardless of their size', () => {
    // one big purchase on the 1st, four small ones on the 2nd
    const result = computeYearActivity(
      [
        makeTransaction({ id: '1', timestampUtc: '2026-03-01T10:00:00.000Z', amountMinor: 90000 }),
        ...[1, 2, 3, 4].map((n) =>
          makeTransaction({
            id: `small-${n}`,
            timestampUtc: `2026-03-02T1${n}:00:00.000Z`,
            amountMinor: 100,
          }),
        ),
      ],
      2026,
    )

    const bigDay = result.find((entry) => entry.key === '2026-03-01')!
    const busyDay = result.find((entry) => entry.key === '2026-03-02')!
    expect(bigDay.level).toBeGreaterThan(busyDay.level)
    expect(busyDay.countLevel).toBeGreaterThan(bigDay.countLevel)
    expect(result.find((entry) => entry.key === '2026-03-03')?.countLevel).toBe(0)
  })
})

// 2026-03-01 is a Sunday, so 2026-03-02 is a Monday and 2026-03-06 a Friday.
function purchasesOn(days: Record<string, number[]>): StandardTransaction[] {
  return Object.entries(days).flatMap(([day, amounts]) =>
    amounts.map((amountMinor, index) =>
      makeTransaction({
        id: `${day}-${index}`,
        timestampUtc: `2026-03-${day}T${String(8 + index).padStart(2, '0')}:00:00.000Z`,
        amountMinor,
      }),
    ),
  )
}

describe('summarizeYearActivity', () => {
  it('reports nothing for a year without purchases', () => {
    expect(summarizeYearActivity(computeYearActivity([], 2026))).toEqual({
      activeDays: 0,
      longestStreak: null,
      biggestSpendDay: null,
      busiestDay: null,
      topSpendWeekday: null,
      topCountWeekday: null,
    })
  })

  it('counts active days and finds the longest run of them, the latest one on a tie', () => {
    const summary = summarizeYearActivity(
      computeYearActivity(
        purchasesOn({ '02': [100], '03': [100], '10': [100], '11': [100], '20': [100] }),
        2026,
      ),
    )

    expect(summary.activeDays).toBe(5)
    expect(summary.longestStreak).toEqual({
      length: 2,
      startKey: '2026-03-10',
      endKey: '2026-03-11',
    })
  })

  it('finds the biggest day by spend and the busiest by purchase count, the latest one on a tie', () => {
    const summary = summarizeYearActivity(
      computeYearActivity(
        purchasesOn({ '02': [9000], '05': [100, 100, 100], '06': [50, 50, 50] }),
        2026,
      ),
    )

    expect(summary.biggestSpendDay?.key).toBe('2026-03-02')
    expect(summary.busiestDay).toMatchObject({ key: '2026-03-06', purchaseCount: 3 })
  })

  it('averages each weekday over every occurrence in the active range, quiet ones included', () => {
    const summary = summarizeYearActivity(
      computeYearActivity(
        purchasesOn({
          // Mondays: 1000 every week, from the 2nd to the 23rd
          '02': [1000],
          '09': [1000],
          '16': [1000],
          '23': [1000],
          // one big Friday, followed by two quiet ones
          '06': [2400],
          // one very busy Wednesday
          '04': [10, 10, 10, 10, 10],
        }),
        2026,
      ),
    )

    // the lone Friday alone would beat Mondays, but spread over the three
    // Fridays in range it averages 800 against Mondays' steady 1000
    expect(summary.topSpendWeekday).toEqual({ weekday: 1, average: 1000 })
    // five purchases over the three Wednesdays in range
    expect(summary.topCountWeekday).toEqual({ weekday: 3, average: 5 / 3 })
  })
})
