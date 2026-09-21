import type { StandardTransaction } from '@/types/transaction'

/**
 * MVP-PLAN §6: a refund-like row (a negative card_spend amount) is detected
 * and excluded from cleared-spend and cashback totals, the same way
 * PENDING/CANCELLED rows are, rather than silently reducing them. Full
 * refund/net-spend semantics are a v2 decision; for now a negative amount
 * just drops the row out of every aggregate here.
 */
export function isEligiblePurchase(transaction: StandardTransaction): boolean {
  return transaction.status === 'CLEARED' && transaction.amountMinor >= 0
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
