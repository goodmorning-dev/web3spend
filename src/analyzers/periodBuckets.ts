import { daysInUtcMonth, formatUtcDateKey, formatUtcMonthKey, getUtcMonth } from '@/utils/dates'
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
