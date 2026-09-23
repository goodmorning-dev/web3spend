import { getUtcMonth, getUtcYear } from '@/utils/dates'
import type { StandardTransaction } from '@/types/transaction'

export interface DashboardFilters {
  currency: string
  /** Omit for "All cards" (MVP-PLAN §5 default). */
  cardId?: string
  /** Omit for every year on record ("All time"). */
  year?: number
  /** Omit for a whole-year view; set for a single month within that year.
   * Ignored without a year. */
  month?: number
}

/**
 * The single place currency/card/period scoping happens. Every other
 * analyzer in this module expects its input to already be the result of
 * this function (or a period-scoped subset built on top of it), so
 * currency/card filtering is never duplicated or forgotten per call site.
 */
export function filterTransactions(
  transactions: StandardTransaction[],
  filters: DashboardFilters,
): StandardTransaction[] {
  return transactions.filter((transaction) => {
    if (transaction.currency !== filters.currency) {
      return false
    }
    if (filters.cardId !== undefined && transaction.cardId !== filters.cardId) {
      return false
    }
    if (filters.year === undefined) {
      return true
    }
    if (getUtcYear(transaction.timestampUtc) !== filters.year) {
      return false
    }
    if (filters.month !== undefined && getUtcMonth(transaction.timestampUtc) !== filters.month) {
      return false
    }
    return true
  })
}
