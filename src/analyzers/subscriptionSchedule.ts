import type { StandardTransaction } from '@/types/transaction'
import { daysInUtcMonth, formatUtcMonthKey, getUtcMonth, getUtcYear } from '@/utils/dates'
import { isEligiblePurchase } from './eligibility'
import type { SubscriptionGroup } from './subscriptions'

const DAY_MS = 24 * 60 * 60 * 1000

/** A month plus a few days' grace: a charge that lands a little late (a
 * weekend, a retry after a declined card) still reads as recent, while a
 * subscription that skipped a whole month doesn't. */
export const RECENT_CHARGE_WINDOW_DAYS = 35

/** How many full months `averageMonthlySpend` looks back over. */
const AVERAGE_WINDOW_MONTHS = 3

function startOfUtcDay(date: Date): number {
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
}

function addMonths(year: number, month: number, delta: number): { year: number; month: number } {
  const index = year * 12 + (month - 1) + delta
  return { year: Math.floor(index / 12), month: (index % 12) + 1 }
}

export function latestCharge(group: SubscriptionGroup): string {
  return group.occurrences[group.occurrences.length - 1].timestampUtc
}

/**
 * Whether the subscription's latest charge falls within
 * RECENT_CHARGE_WINDOW_DAYS of `asOfUtc`. Callers pass the newest timestamp
 * in the imported data rather than today, since everything here comes from
 * an export: a file imported two months ago shouldn't make every
 * subscription in it look stopped.
 */
export function isRecentlyCharged(group: SubscriptionGroup, asOfUtc: string): boolean {
  const elapsed = new Date(asOfUtc).getTime() - new Date(latestCharge(group)).getTime()
  return elapsed <= RECENT_CHARGE_WINDOW_DAYS * DAY_MS
}

/**
 * The next date this subscription should charge on, projected from its usual
 * day of the month: the first such day that's today or later and after its
 * latest charge. In a month too short for that day (the 31st in September),
 * it lands on the month's last day instead. Returned as midnight UTC.
 */
export function nextChargeDate(group: SubscriptionGroup, now: Date): Date {
  const today = startOfUtcDay(now)
  const latest = startOfUtcDay(new Date(latestCharge(group)))
  for (let offset = 0; ; offset++) {
    const { year, month } = addMonths(now.getUTCFullYear(), now.getUTCMonth() + 1, offset)
    const day = Math.min(group.dayOfMonth, daysInUtcMonth(year, month))
    const candidate = Date.UTC(year, month - 1, day)
    if (candidate >= today && candidate > latest) {
      return new Date(candidate)
    }
  }
}

/** Whole days from today (UTC) until `date`; 0 means today. */
export function daysUntil(date: Date, now: Date): number {
  return Math.round((startOfUtcDay(date) - startOfUtcDay(now)) / DAY_MS)
}

export interface SubscriptionMonth {
  year: number
  month: number
  charged: boolean
}

/** The `count` calendar months ending with the one `asOfUtc` falls in,
 * oldest first, each marked with whether the subscription charged in it. */
export function recentMonths(
  group: SubscriptionGroup,
  asOfUtc: string,
  count = 12,
): SubscriptionMonth[] {
  const chargedMonthKeys = new Set(group.occurrences.map((occurrence) => occurrence.monthKey))
  const asOfYear = getUtcYear(asOfUtc)
  const asOfMonth = getUtcMonth(asOfUtc)
  return Array.from({ length: count }, (_, index) => {
    const { year, month } = addMonths(asOfYear, asOfMonth, index - (count - 1))
    return { year, month, charged: chargedMonthKeys.has(formatUtcMonthKey(year, month)) }
  })
}

export interface MonthlySpendAverage {
  averageMinor: number
  /** The oldest and newest months that went into the average. */
  from: { year: number; month: number }
  to: { year: number; month: number }
}

/**
 * Average cleared spend per month across the last few full months on record
 * before the one `asOfUtc` falls in (which is usually still in progress).
 * Only months that have any transactions count, so a gap before someone's
 * first import doesn't drag the average down. null when there's no full
 * month to average yet. `transactions` must already be scoped to one
 * currency.
 */
export function averageMonthlySpend(
  transactions: StandardTransaction[],
  asOfUtc: string,
): MonthlySpendAverage | null {
  const asOfKey = formatUtcMonthKey(getUtcYear(asOfUtc), getUtcMonth(asOfUtc))
  const spendByMonth = new Map<string, number>()
  for (const transaction of transactions) {
    const key = formatUtcMonthKey(
      getUtcYear(transaction.timestampUtc),
      getUtcMonth(transaction.timestampUtc),
    )
    if (key >= asOfKey) {
      continue
    }
    const spend = isEligiblePurchase(transaction) ? transaction.amountMinor : 0
    spendByMonth.set(key, (spendByMonth.get(key) ?? 0) + spend)
  }

  const monthKeys = [...spendByMonth.keys()].sort().slice(-AVERAGE_WINDOW_MONTHS)
  if (monthKeys.length === 0) {
    return null
  }
  const total = monthKeys.reduce((sum, key) => sum + (spendByMonth.get(key) ?? 0), 0)
  const toYearMonth = (key: string) => {
    const [year, month] = key.split('-').map(Number)
    return { year, month }
  }
  return {
    averageMinor: Math.round(total / monthKeys.length),
    from: toYearMonth(monthKeys[0]),
    to: toYearMonth(monthKeys[monthKeys.length - 1]),
  }
}
