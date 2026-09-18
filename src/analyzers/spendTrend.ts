import { daysInUtcMonth, getUtcMonth, getUtcYear } from '@/utils/dates'
import type { StandardTransaction } from '@/types/transaction'
import { assertSingleCurrency } from './assertSingleCurrency'
import { bucketByDay } from './periodBuckets'

export interface SpendTrendPoint {
  day: number
  /** null once past the last day this month's data actually covers, so the
   * line stops there instead of implying a future day already has 0 spend. */
  thisMonthMinor: number | null
  lastMonthMinor: number
  averageMonthlyMinor: number
}

function cumulativeSpendByDay(
  transactions: StandardTransaction[],
  year: number,
  month: number,
): number[] {
  let running = 0
  return bucketByDay(transactions, year, month).map((bucket) => {
    running += bucket.spendMinor
    return running
  })
}

function previousMonth(year: number, month: number): { year: number; month: number } {
  return month === 1 ? { year: year - 1, month: 12 } : { year, month: month - 1 }
}

/** Every day already counts as "known" once the selected month is fully in
 * the past; for the actual current UTC month, only today and earlier do. */
function toDateCutoffDay(year: number, month: number, daysInMonth: number): number {
  const now = new Date()
  const isCurrentMonth = year === now.getUTCFullYear() && month === now.getUTCMonth() + 1
  return isCurrentMonth ? now.getUTCDate() : daysInMonth
}

/** A day index past a series' own month length holds its final cumulative
 * total flat, since no further spend happens in a month once it's over. */
function atDayOrFinal(series: number[], index: number): number {
  return series[index] ?? series[series.length - 1] ?? 0
}

/**
 * The dashboard's "Spending this month" line chart: cumulative spend for the
 * selected month, next to the same cumulative curve for the prior calendar
 * month and an average across every other month on record, so a viewer can
 * see whether this month is running ahead of or behind normal.
 * `scopedTransactions` must already be filtered to one currency/card (see
 * filters.ts) but, unlike every other analyzer here, spans every period on
 * record rather than just the selected one, since the comparison lines need
 * other months' data too.
 */
export function computeSpendTrend(
  scopedTransactions: StandardTransaction[],
  year: number,
  month: number,
): SpendTrendPoint[] {
  assertSingleCurrency(scopedTransactions)

  const byMonthKey = new Map<string, StandardTransaction[]>()
  for (const transaction of scopedTransactions) {
    const key = `${getUtcYear(transaction.timestampUtc)}-${getUtcMonth(transaction.timestampUtc)}`
    const bucket = byMonthKey.get(key)
    if (bucket) {
      bucket.push(transaction)
    } else {
      byMonthKey.set(key, [transaction])
    }
  }

  const daysInSelectedMonth = daysInUtcMonth(year, month)
  const cutoffDay = toDateCutoffDay(year, month, daysInSelectedMonth)
  const thisMonthCumulative = cumulativeSpendByDay(
    byMonthKey.get(`${year}-${month}`) ?? [],
    year,
    month,
  )

  const { year: lastYear, month: lastMonth } = previousMonth(year, month)
  const lastMonthCumulative = cumulativeSpendByDay(
    byMonthKey.get(`${lastYear}-${lastMonth}`) ?? [],
    lastYear,
    lastMonth,
  )

  const otherMonthCumulatives = [...byMonthKey.entries()]
    .filter(([key]) => key !== `${year}-${month}`)
    .map(([key, transactions]) => {
      const [otherYear, otherMonth] = key.split('-').map(Number)
      return cumulativeSpendByDay(transactions, otherYear, otherMonth)
    })

  const averageMonthlyCumulative = Array.from({ length: daysInSelectedMonth }, (_, index) => {
    if (otherMonthCumulatives.length === 0) {
      return 0
    }
    const total = otherMonthCumulatives.reduce(
      (sum, series) => sum + atDayOrFinal(series, index),
      0,
    )
    return Math.round(total / otherMonthCumulatives.length)
  })

  return Array.from({ length: daysInSelectedMonth }, (_, index) => ({
    day: index + 1,
    thisMonthMinor: index < cutoffDay ? (thisMonthCumulative[index] ?? 0) : null,
    lastMonthMinor: atDayOrFinal(lastMonthCumulative, index),
    averageMonthlyMinor: averageMonthlyCumulative[index],
  }))
}
