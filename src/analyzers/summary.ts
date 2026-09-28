import type { StandardTransaction } from '@/types/transaction'
import { assertSingleCurrency } from './assertSingleCurrency'
import { addCashback, listCashbackTotals, type CashbackTotal } from './cashbackTotals'
import { hasCompatibleCashbackCurrency, isEligiblePurchase } from './eligibility'

export interface PeriodSummary {
  /** Cleared and pending purchases (see isEligiblePurchase). */
  spendMinor: number
  purchaseCount: number
  /** Sums only cashback reported in the same currency as its purchase; see
   * `cashbackComplete` below for whether that covers every purchase. */
  cashbackMinor: number
  /** false when at least one purchase's cashback currency didn't match its
   * spend currency, so `cashbackMinor` excludes it and understates the real
   * total. A caller must not infer this from `effectiveCashbackPct` being
   * null, since that also happens with zero spend. */
  cashbackComplete: boolean
  /** All the cashback on these purchases, per currency it was recorded in
   * (see cashbackTotals), their own currency first. Unlike `cashbackMinor`,
   * this includes cashback recorded in another currency, so it can still
   * be shown when it can't be added to the rest. */
  cashbackByCurrency: CashbackTotal[]
  /** null ("unavailable") rather than 0 when there's no spend to divide by, or when
   * cashback couldn't be safely combined across currencies. */
  effectiveCashbackPct: number | null
  /** How many of `purchaseCount` are still pending, and the part of
   * `spendMinor` and `cashbackMinor` they account for, so the dashboard can
   * show what's settled apart from what's still pending. */
  pendingCount: number
  pendingSpendMinor: number
  pendingCashbackMinor: number
  cancelledCount: number
}

/**
 * MVP-PLAN §6: cleared and pending purchases drive the spend and cashback
 * totals, with how many are pending counted alongside; a refund-like row
 * (negative amount) is excluded from both, and CANCELLED stays inspectable
 * but excluded too. Always computed from summed minor units, never by
 * averaging pre-computed percentages, so a caller can safely reuse this for
 * a month or a whole year alike.
 */
export function summarizeTransactions(transactions: StandardTransaction[]): PeriodSummary {
  assertSingleCurrency(transactions)

  let spendMinor = 0
  let purchaseCount = 0
  let cashbackMinor = 0
  let cashbackCurrencyMismatch = false
  const cashbackTotals = new Map<string, CashbackTotal>()
  let pendingCount = 0
  let pendingSpendMinor = 0
  let pendingCashbackMinor = 0
  let cancelledCount = 0

  for (const transaction of transactions) {
    if (transaction.status === 'CANCELLED') {
      cancelledCount += 1
      continue
    }
    if (!isEligiblePurchase(transaction)) {
      continue
    }

    const isPending = transaction.status === 'PENDING'
    spendMinor += transaction.amountMinor
    purchaseCount += 1
    if (isPending) {
      pendingCount += 1
      pendingSpendMinor += transaction.amountMinor
    }
    addCashback(cashbackTotals, transaction)
    if (hasCompatibleCashbackCurrency(transaction)) {
      cashbackMinor += transaction.cashbackMinor
      if (isPending) {
        pendingCashbackMinor += transaction.cashbackMinor
      }
    } else {
      cashbackCurrencyMismatch = true
    }
  }

  return {
    spendMinor,
    purchaseCount,
    cashbackMinor,
    cashbackComplete: !cashbackCurrencyMismatch,
    cashbackByCurrency: listCashbackTotals(cashbackTotals, transactions[0]?.currency),
    effectiveCashbackPct:
      !cashbackCurrencyMismatch && spendMinor > 0 ? (cashbackMinor / spendMinor) * 100 : null,
    pendingCount,
    pendingSpendMinor,
    pendingCashbackMinor,
    cancelledCount,
  }
}
