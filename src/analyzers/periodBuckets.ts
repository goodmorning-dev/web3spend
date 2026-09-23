import {
  daysInUtcMonth,
  formatUtcDateKey,
  formatUtcMonthKey,
  getUtcMonth,
  getUtcYear,
} from '@/utils/dates'
import type { StandardTransaction } from '@/types/transaction'
import { assertSingleCurrency } from './assertSingleCurrency'
import { hasCompatibleCashbackCurrency, isEligiblePurchase } from './eligibility'

export interface PeriodBucket {
  key: string
  spendMinor: number
  cashbackMinor: number
  /** null ("unavailable") rather than 0 when this bucket has no cleared spend,
   * or when its cashback couldn't be safely combined across currencies. */
  effectiveCashbackPct: number | null
}

interface BucketAccumulator {
  spendMinor: number
  cashbackMinor: number
  cashbackCurrencyMismatch: boolean
}

function createAccumulator(): BucketAccumulator {
  return { spendMinor: 0, cashbackMinor: 0, cashbackCurrencyMismatch: false }
}

function addToAccumulator(accumulator: BucketAccumulator, transaction: StandardTransaction): void {
  accumulator.spendMinor += transaction.amountMinor
  if (hasCompatibleCashbackCurrency(transaction)) {
    accumulator.cashbackMinor += transaction.cashbackMinor
  } else {
    accumulator.cashbackCurrencyMismatch = true
  }
}

function toBucket(key: string, accumulator: BucketAccumulator): PeriodBucket {
  const { spendMinor, cashbackMinor, cashbackCurrencyMismatch } = accumulator
  return {
    key,
    spendMinor,
    cashbackMinor,
    effectiveCashbackPct:
      !cashbackCurrencyMismatch && spendMinor > 0 ? (cashbackMinor / spendMinor) * 100 : null,
  }
}

/**
 * MVP-PLAN §5: daily spend/cashback totals within a selected month, one
 * bucket per calendar day including zero-spend days, so a chart's x-axis
 * stays continuous. `transactions` must already be filtered to this
 * currency/card/year/month (see filters.ts); a refund-like row (negative
 * amount) is excluded, per MVP-PLAN §6, the same as everywhere else.
 */
export function bucketByDay(
  transactions: StandardTransaction[],
  year: number,
  month: number,
): PeriodBucket[] {
  assertSingleCurrency(transactions)

  const byDay = new Map<number, BucketAccumulator>()
  for (const transaction of transactions) {
    if (!isEligiblePurchase(transaction)) {
      continue
    }
    const day = new Date(transaction.timestampUtc).getUTCDate()
    const accumulator = byDay.get(day) ?? createAccumulator()
    addToAccumulator(accumulator, transaction)
    byDay.set(day, accumulator)
  }

  const days = daysInUtcMonth(year, month)
  return Array.from({ length: days }, (_, index) => {
    const day = index + 1
    return toBucket(formatUtcDateKey(year, month, day), byDay.get(day) ?? createAccumulator())
  })
}

/**
 * MVP-PLAN §5: monthly spend/cashback totals within a selected year, one
 * bucket per calendar month including zero-spend months. `transactions`
 * must already be filtered to this currency/card/year (see filters.ts); a
 * refund-like row (negative amount) is excluded, per MVP-PLAN §6, the same
 * as everywhere else.
 */
export function bucketByMonth(transactions: StandardTransaction[], year: number): PeriodBucket[] {
  assertSingleCurrency(transactions)

  const byMonth = new Map<number, BucketAccumulator>()
  for (const transaction of transactions) {
    if (!isEligiblePurchase(transaction)) {
      continue
    }
    const month = getUtcMonth(transaction.timestampUtc)
    const accumulator = byMonth.get(month) ?? createAccumulator()
    addToAccumulator(accumulator, transaction)
    byMonth.set(month, accumulator)
  }

  return Array.from({ length: 12 }, (_, index) => {
    const month = index + 1
    return toBucket(formatUtcMonthKey(year, month), byMonth.get(month) ?? createAccumulator())
  })
}

export interface MonthBucket extends PeriodBucket {
  /** Whether any transaction at all, cleared or not, fell in this month. A
   * month without one may be a gap in the imported data rather than a month
   * with no spending. */
  hasTransactions: boolean
}

/**
 * Monthly spend/cashback totals for views wider than one month, such as
 * "All time": one bucket per calendar month from the earliest to
 * the latest month `transactions` touch, quiet months in between included
 * so the x-axis stays continuous. Deliberately clipped to the data's own
 * range rather than padded out to whole calendar years, so a first import
 * covering June to September doesn't show five months of zeros that read
 * as "spent nothing". `transactions` must already be filtered to one
 * currency/card and the period in view (see filters.ts).
 */
export function bucketByMonthRange(transactions: StandardTransaction[]): MonthBucket[] {
  assertSingleCurrency(transactions)
  if (transactions.length === 0) {
    return []
  }

  const byMonth = new Map<string, BucketAccumulator>()
  const monthsWithTransactions = new Set<string>()
  let firstKey: string | null = null
  let lastKey: string | null = null
  for (const transaction of transactions) {
    const key = formatUtcMonthKey(
      getUtcYear(transaction.timestampUtc),
      getUtcMonth(transaction.timestampUtc),
    )
    if (firstKey === null || key < firstKey) {
      firstKey = key
    }
    if (lastKey === null || key > lastKey) {
      lastKey = key
    }
    monthsWithTransactions.add(key)
    if (!isEligiblePurchase(transaction)) {
      continue
    }
    const accumulator = byMonth.get(key) ?? createAccumulator()
    addToAccumulator(accumulator, transaction)
    byMonth.set(key, accumulator)
  }

  const buckets: MonthBucket[] = []
  let [year, month] = firstKey!.split('-').map(Number)
  for (;;) {
    const key = formatUtcMonthKey(year, month)
    buckets.push({
      ...toBucket(key, byMonth.get(key) ?? createAccumulator()),
      hasTransactions: monthsWithTransactions.has(key),
    })
    if (key === lastKey) {
      return buckets
    }
    month += 1
    if (month > 12) {
      month = 1
      year += 1
    }
  }
}

export interface FullMonthAverage {
  averageMinor: number
  /** How many months went into the average. */
  monthCount: number
}

/**
 * Average spend per month across only the months the imported data most
 * likely covers in full: everything strictly between the first and the
 * latest month (the data may start or stop partway through either), minus
 * months with no transactions at all (possibly a gap in the export rather
 * than a month with no spending). An average that included those would
 * quietly understate a typical month. null when no such month exists yet.
 */
export function averageFullMonthSpend(buckets: MonthBucket[]): FullMonthAverage | null {
  const fullMonths = buckets.slice(1, -1).filter((bucket) => bucket.hasTransactions)
  if (fullMonths.length === 0) {
    return null
  }
  const total = fullMonths.reduce((sum, bucket) => sum + bucket.spendMinor, 0)
  return { averageMinor: Math.round(total / fullMonths.length), monthCount: fullMonths.length }
}
