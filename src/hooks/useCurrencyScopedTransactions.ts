import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/storage/db'
import type { StandardTransaction } from '@/types/transaction'
import type { SelectedFilters } from './DashboardFiltersContext'

/**
 * The spend-trend line chart's "last month" and "average monthly" series are
 * computed from every month on record, not just the selected period, so it
 * needs a currency/card scoped set with the year/month restriction dropped,
 * unlike `useFilteredTransactions` which every other dashboard view uses.
 */
export function useCurrencyScopedTransactions(
  filters: SelectedFilters | null,
): StandardTransaction[] | undefined {
  return useLiveQuery(async () => {
    if (!filters) {
      return undefined
    }
    const all = await db.transactions.toArray()
    return all.filter(
      (transaction) =>
        transaction.currency === filters.currency &&
        (filters.cardId === undefined || transaction.cardId === filters.cardId),
    )
  }, [filters?.currency, filters?.cardId])
}
