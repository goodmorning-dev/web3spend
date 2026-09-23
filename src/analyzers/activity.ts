import { daysInUtcYear, formatUtcDateKey, getUtcDateKey } from '@/utils/dates'
import type { StandardTransaction } from '@/types/transaction'
import { assertSingleCurrency } from './assertSingleCurrency'
import { isEligiblePurchase } from './eligibility'

const INTENSITY_LEVELS = 4

export interface DayActivity {
  key: string
  spendMinor: number
  /** Cleared purchases that day: the same rows spendMinor adds up. */
  purchaseCount: number
  /** 0 = no spend; 1-4 = quantile bucket among this year's spending days. */
  level: number
  /** The same scale as `level`, bucketed by purchaseCount instead. */
  countLevel: number
}

/**
 * TECHNICAL-PLAN §9: a GitHub-contribution-style year grid, one cell per
 * calendar day, shaded by that day's cleared spend (a refund-like negative
 * row is excluded, per MVP-PLAN §6), or by how many cleared purchases it
 * had. Both come from the same rows, so the two views light up the same
 * days (a zero-amount purchase aside), just at different intensities.
 * Levels are quantile buckets over the observed spending days (not a fixed
 * threshold), so the scale stays meaningful regardless of a user's typical
 * spend level or purchase frequency. `transactions` must already be
 * filtered to this currency/card/year.
 */
export function computeYearActivity(
  transactions: StandardTransaction[],
  year: number,
): DayActivity[] {
  assertSingleCurrency(transactions)

  const spendByDay = new Map<string, number>()
  const countByDay = new Map<string, number>()
  for (const transaction of transactions) {
    if (!isEligiblePurchase(transaction)) {
      continue
    }
    const key = getUtcDateKey(transaction.timestampUtc)
    spendByDay.set(key, (spendByDay.get(key) ?? 0) + transaction.amountMinor)
    countByDay.set(key, (countByDay.get(key) ?? 0) + 1)
  }

  const thresholds = computeQuantileThresholds(sortedPositive(spendByDay), INTENSITY_LEVELS)
  const countThresholds = computeQuantileThresholds(sortedPositive(countByDay), INTENSITY_LEVELS)

  const totalDays = daysInUtcYear(year)
  const startOfYear = Date.UTC(year, 0, 1)

  return Array.from({ length: totalDays }, (_, index) => {
    const date = new Date(startOfYear + index * 86_400_000)
    const key = formatUtcDateKey(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate())
    const spendMinor = spendByDay.get(key) ?? 0
    const purchaseCount = countByDay.get(key) ?? 0
    return {
      key,
      spendMinor,
      purchaseCount,
      level: spendMinor > 0 ? quantileLevel(spendMinor, thresholds) : 0,
      countLevel: purchaseCount > 0 ? quantileLevel(purchaseCount, countThresholds) : 0,
    }
  })
}

function sortedPositive(valuesByDay: Map<string, number>): number[] {
  return [...valuesByDay.values()].filter((value) => value > 0).sort((a, b) => a - b)
}

export interface ActivityStreak {
  length: number
  startKey: string
  endKey: string
}

export interface WeekdayAverage {
  /** 0 = Sunday, as Date.getUTCDay() counts. */
  weekday: number
  average: number
}

export interface YearActivitySummary {
  /** Days with at least one cleared purchase. */
  activeDays: number
  longestStreak: ActivityStreak | null
  biggestSpendDay: DayActivity | null
  busiestDay: DayActivity | null
  /** Average spend (minor units) per occurrence of the weekday. */
  topSpendWeekday: WeekdayAverage | null
  /** Average number of purchases per occurrence of the weekday. */
  topCountWeekday: WeekdayAverage | null
}

/**
 * A few headline facts about one year's grid from computeYearActivity: how
 * many days had a purchase, the longest run of consecutive such days, the
 * single biggest and busiest days, and which weekday is typically the
 * heaviest by spend and by purchase count. Where two days tie, the more
 * recent one wins, since that's the one people are likelier to remember.
 *
 * Weekday averages cover every occurrence of that weekday from the first to
 * the last day with a purchase, quiet days included, so a single expensive
 * Friday doesn't make Fridays look typical, and the empty future end of the
 * current year doesn't drag every weekday down either.
 */
export function summarizeYearActivity(activity: DayActivity[]): YearActivitySummary {
  let activeDays = 0
  let firstActive = -1
  let lastActive = -1
  let runStart = -1
  let longestStreak: ActivityStreak | null = null
  let biggestSpendDay: DayActivity | null = null
  let busiestDay: DayActivity | null = null

  for (let index = 0; index < activity.length; index++) {
    const day = activity[index]
    if (day.purchaseCount === 0) {
      runStart = -1
      continue
    }
    activeDays += 1
    if (firstActive < 0) {
      firstActive = index
    }
    lastActive = index
    if (runStart < 0) {
      runStart = index
    }
    const length = index - runStart + 1
    if (!longestStreak || length >= longestStreak.length) {
      longestStreak = { length, startKey: activity[runStart].key, endKey: day.key }
    }
    if (!biggestSpendDay || day.spendMinor >= biggestSpendDay.spendMinor) {
      biggestSpendDay = day
    }
    if (!busiestDay || day.purchaseCount >= busiestDay.purchaseCount) {
      busiestDay = day
    }
  }

  if (activeDays === 0) {
    return {
      activeDays,
      longestStreak,
      biggestSpendDay,
      busiestDay,
      topSpendWeekday: null,
      topCountWeekday: null,
    }
  }

  const occurrences = Array<number>(7).fill(0)
  const spendTotals = Array<number>(7).fill(0)
  const countTotals = Array<number>(7).fill(0)
  for (const day of activity.slice(firstActive, lastActive + 1)) {
    const weekday = new Date(`${day.key}T00:00:00.000Z`).getUTCDay()
    occurrences[weekday] += 1
    spendTotals[weekday] += day.spendMinor
    countTotals[weekday] += day.purchaseCount
  }

  return {
    activeDays,
    longestStreak,
    biggestSpendDay,
    busiestDay,
    topSpendWeekday: topWeekday(spendTotals, occurrences),
    topCountWeekday: topWeekday(countTotals, occurrences),
  }
}

function topWeekday(totals: number[], occurrences: number[]): WeekdayAverage | null {
  let top: WeekdayAverage | null = null
  for (let weekday = 0; weekday < 7; weekday++) {
    if (occurrences[weekday] === 0) {
      continue
    }
    const average = totals[weekday] / occurrences[weekday]
    if (!top || average > top.average) {
      top = { weekday, average }
    }
  }
  return top
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
