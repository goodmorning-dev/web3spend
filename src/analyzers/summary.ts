import type { StandardTransaction } from '@/types/transaction'
import { assertSingleCurrency } from './assertSingleCurrency'
import { hasCompatibleCashbackCurrency, isEligiblePurchase } from './eligibility'

export interface PeriodSummary {
  clearedSpendMinor: number
  clearedCount: number
  clearedCashbackMinor: number
  /** null ("unavailable") rather than 0 when there's no cleared spend to divide by, or when
   * cashback couldn't be safely combined across currencies. */
  effectiveCashbackPct: number | null
  pendingSpendMinor: number
  pendingCount: number
  cancelledCount: number
}

/**
 * MVP-PLAN §6: CLEARED rows drive the default spend/cashback totals, but a
 * refund-like row (negative amount) is excluded from both, the same way
 * PENDING/CANCELLED are. PENDING is reported separately, never folded into
 * cleared totals; CANCELLED stays inspectable but excluded from both.
 * Always computed from summed minor units, never by averaging pre-computed
 * percentages, so a caller can safely reuse this for a month or a whole
 * year alike.
 */
export function summarizeTransactions(transactions: StandardTransaction[]): PeriodSummary {
  assertSingleCurrency(transactions)

  let clearedSpendMinor = 0
  let clearedCount = 0
  let clearedCashbackMinor = 0
  let cashbackCurrencyMismatch = false
  let pendingSpendMinor = 0
  let pendingCount = 0
  let cancelledCount = 0

  for (const transaction of transactions) {
    if (transaction.status === 'PENDING') {
      pendingSpendMinor += transaction.amountMinor
      pendingCount += 1
      continue
    }
    if (transaction.status === 'CANCELLED') {
      cancelledCount += 1
      continue
    }
    if (!isEligiblePurchase(transaction)) {
      continue
    }

    clearedSpendMinor += transaction.amountMinor
    clearedCount += 1
    if (hasCompatibleCashbackCurrency(transaction)) {
      clearedCashbackMinor += transaction.cashbackMinor
    } else {
      cashbackCurrencyMismatch = true
    }
  }

  return {
    clearedSpendMinor,
    clearedCount,
    clearedCashbackMinor,
    effectiveCashbackPct:
      !cashbackCurrencyMismatch && clearedSpendMinor > 0
        ? (clearedCashbackMinor / clearedSpendMinor) * 100
        : null,
    pendingSpendMinor,
    pendingCount,
    cancelledCount,
  }
}
