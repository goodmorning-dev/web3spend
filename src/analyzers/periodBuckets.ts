import { daysInUtcMonth, formatUtcDateKey, formatUtcMonthKey, getUtcMonth } from '@/utils/dates'
import type { StandardTransaction } from '@/types/transaction'
import { assertSingleCurrency } from './assertSingleCurrency'

export interface PeriodBucket {
  key: string
  spendMinor: number
  cashbackMinor: number
  /** null ("unavailable") rather than 0 when this bucket has no cleared spend. */
  effectiveCashbackPct: number | null
}

function toBucket(key: string, spendMinor: number, cashbackMinor: number): PeriodBucket {
  return {
    key,
    spendMinor,
    cashbackMinor,
    effectiveCashbackPct: spendMinor > 0 ? (cashbackMinor / spendMinor) * 100 : null,
  }
}

/**
 * MVP-PLAN §5: daily spend/cashback totals within a selected month, one
 * bucket per calendar day including zero-spend days, so a chart's x-axis
 * stays continuous. `transactions` must already be filtered to this
 * currency/card/year/month (see filters.ts); cleared rows only.
 */
export function bucketByDay(
  transactions: StandardTransaction[],
  year: number,
  month: number,
): PeriodBucket[] {
  assertSingleCurrency(transactions)

  const spendByDay = new Map<number, number>()
  const cashbackByDay = new Map<number, number>()
  for (const transaction of transactions) {
    if (transaction.status !== 'CLEARED') {
      continue
    }
    const day = new Date(transaction.timestampUtc).getUTCDate()
    spendByDay.set(day, (spendByDay.get(day) ?? 0) + transaction.amountMinor)
    cashbackByDay.set(day, (cashbackByDay.get(day) ?? 0) + transaction.cashbackMinor)
  }

  const days = daysInUtcMonth(year, month)
  return Array.from({ length: days }, (_, index) => {
    const day = index + 1
    return toBucket(
      formatUtcDateKey(year, month, day),
      spendByDay.get(day) ?? 0,
      cashbackByDay.get(day) ?? 0,
    )
  })
}

/**
 * MVP-PLAN §5: monthly spend/cashback totals within a selected year, one
 * bucket per calendar month including zero-spend months. `transactions`
 * must already be filtered to this currency/card/year (see filters.ts);
 * cleared rows only.
 */
export function bucketByMonth(transactions: StandardTransaction[], year: number): PeriodBucket[] {
  assertSingleCurrency(transactions)

  const spendByMonth = new Map<number, number>()
  const cashbackByMonth = new Map<number, number>()
  for (const transaction of transactions) {
    if (transaction.status !== 'CLEARED') {
      continue
    }
    const month = getUtcMonth(transaction.timestampUtc)
    spendByMonth.set(month, (spendByMonth.get(month) ?? 0) + transaction.amountMinor)
    cashbackByMonth.set(month, (cashbackByMonth.get(month) ?? 0) + transaction.cashbackMinor)
  }

  return Array.from({ length: 12 }, (_, index) => {
    const month = index + 1
    return toBucket(
      formatUtcMonthKey(year, month),
      spendByMonth.get(month) ?? 0,
      cashbackByMonth.get(month) ?? 0,
    )
  })
}
