import { describe, expect, it } from 'vitest'
import type { StandardTransaction } from '@/types/transaction'
import { computeYearActivity } from './activity'

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
})
