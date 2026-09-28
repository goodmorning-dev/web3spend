import type { StandardTransaction } from '@/types/transaction'

/**
 * MVP-PLAN §6: which rows count toward spend, cashback and everything built
 * on them. Cleared and pending purchases both count: a pending purchase is
 * money already spent, and if it's later cancelled, importing a newer
 * export updates its status and it drops out. Cancelled purchases never
 * count. A refund-like row (a negative card_spend amount) is detected and
 * excluded too, rather than silently reducing the totals; full
 * refund/net-spend semantics are a v2 decision.
 */
export function isEligiblePurchase(transaction: StandardTransaction): boolean {
  return (
    (transaction.status === 'CLEARED' || transaction.status === 'PENDING') &&
    transaction.amountMinor >= 0
  )
}

/**
 * MVP-PLAN §6: effective cashback is only computed "when currencies...
 * match." A transaction's cashback can be reported in a different currency
 * than its spend; combining that cashback figure into a total denominated
 * in the spend currency would silently mix units.
 */
export function hasCompatibleCashbackCurrency(transaction: StandardTransaction): boolean {
  return transaction.cashbackCurrency === transaction.currency
}

/**
 * A single row's own effective cashback rate, for display next to its
 * cashback amount (e.g. the transactions table). Same reasoning as
 * `PeriodSummary.effectiveCashbackPct`: null ("unavailable") rather than a
 * misleading number when there's no positive spend to divide by, or when
 * cashback was reported in a different currency than the spend itself.
 */
export function transactionCashbackPct(transaction: StandardTransaction): number | null {
  if (!hasCompatibleCashbackCurrency(transaction) || transaction.amountMinor <= 0) {
    return null
  }
  return (transaction.cashbackMinor / transaction.amountMinor) * 100
}
