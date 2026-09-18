import type { StandardTransaction } from '@/types/transaction'
import { assertSingleCurrency } from './assertSingleCurrency'

export interface PeriodSummary {
  clearedSpendMinor: number
  clearedCashbackMinor: number
  /** null ("unavailable") rather than 0 when there's no cleared spend to divide by. */
  effectiveCashbackPct: number | null
  pendingSpendMinor: number
  pendingCount: number
  cancelledCount: number
}

/**
 * MVP-PLAN §6: CLEARED rows drive the default spend/cashback totals; PENDING
 * is reported separately, never folded into cleared totals; CANCELLED stays
 * inspectable but excluded from both. Always computed from summed minor
 * units, never by averaging pre-computed percentages, so a caller can safely
 * reuse this for a month or a whole year alike.
 */
export function summarizeTransactions(transactions: StandardTransaction[]): PeriodSummary {
  assertSingleCurrency(transactions)

  let clearedSpendMinor = 0
  let clearedCashbackMinor = 0
  let pendingSpendMinor = 0
  let pendingCount = 0
  let cancelledCount = 0

  for (const transaction of transactions) {
    switch (transaction.status) {
      case 'CLEARED':
        clearedSpendMinor += transaction.amountMinor
        clearedCashbackMinor += transaction.cashbackMinor
        break
      case 'PENDING':
        pendingSpendMinor += transaction.amountMinor
        pendingCount += 1
        break
      case 'CANCELLED':
        cancelledCount += 1
        break
    }
  }

  return {
    clearedSpendMinor,
    clearedCashbackMinor,
    effectiveCashbackPct:
      clearedSpendMinor > 0 ? (clearedCashbackMinor / clearedSpendMinor) * 100 : null,
    pendingSpendMinor,
    pendingCount,
    cancelledCount,
  }
}
