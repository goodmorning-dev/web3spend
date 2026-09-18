import { daysInUtcYear, formatUtcDateKey, getUtcDateKey } from '@/utils/dates'
import type { StandardTransaction } from '@/types/transaction'
import { assertSingleCurrency } from './assertSingleCurrency'

const INTENSITY_LEVELS = 4

export interface DayActivity {
  key: string
  spendMinor: number
  /** 0 = no spend; 1-4 = quantile bucket among this year's spending days. */
  level: number
}

/**
 * TECHNICAL-PLAN §9: a GitHub-contribution-style year grid, one cell per
 * calendar day, shaded by that day's cleared spend. Levels are quantile
 * buckets over the observed spending days (not a fixed threshold), so the
 * scale stays meaningful regardless of a user's typical spend level.
 * `transactions` must already be filtered to this currency/card/year.
 */
export function computeYearActivity(
  transactions: StandardTransaction[],
  year: number,
): DayActivity[] {
  assertSingleCurrency(transactions)

  const spendByDay = new Map<string, number>()
  for (const transaction of transactions) {
    if (transaction.status !== 'CLEARED') {
      continue
    }
    const key = getUtcDateKey(transaction.timestampUtc)
    spendByDay.set(key, (spendByDay.get(key) ?? 0) + transaction.amountMinor)
  }

  const spendingDayValues = [...spendByDay.values()]
    .filter((value) => value > 0)
    .sort((a, b) => a - b)
  const thresholds = computeQuantileThresholds(spendingDayValues, INTENSITY_LEVELS)

  const totalDays = daysInUtcYear(year)
  const startOfYear = Date.UTC(year, 0, 1)

  return Array.from({ length: totalDays }, (_, index) => {
    const date = new Date(startOfYear + index * 86_400_000)
    const key = formatUtcDateKey(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate())
    const spendMinor = spendByDay.get(key) ?? 0
    return {
      key,
      spendMinor,
      level: spendMinor > 0 ? quantileLevel(spendMinor, thresholds) : 0,
    }
  })
}

/** `levels - 1` thresholds splitting `sortedValues` into `levels` equal-count buckets. */
function computeQuantileThresholds(sortedValues: number[], levels: number): number[] {
  const thresholds: number[] = []
  for (let level = 1; level < levels; level++) {
    const index = Math.min(
      sortedValues.length - 1,
      Math.floor((sortedValues.length * level) / levels),
    )
    thresholds.push(sortedValues[index])
  }
  return thresholds
}

function quantileLevel(value: number, thresholds: number[]): number {
  let level = 1
  for (const threshold of thresholds) {
    if (value > threshold) {
      level += 1
    }
  }
  return level
}
