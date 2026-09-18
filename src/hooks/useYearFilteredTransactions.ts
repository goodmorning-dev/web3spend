import { useLiveQuery } from 'dexie-react-hooks'
import { filterTransactions } from '@/analyzers'
import { db } from '@/storage/db'
import type { StandardTransaction } from '@/types/transaction'
import type { SelectedFilters } from './DashboardFiltersContext'

/**
 * The activity heatmap (TECHNICAL-PLAN §9) covers a full calendar year, so
 * it needs the selected currency/card scoped to `filters.year` with the
 * month restriction dropped, unlike `useFilteredTransactions` which every
 * other dashboard view uses.
 */
export function useYearFilteredTransactions(
  filters: SelectedFilters | null,
): StandardTransaction[] | undefined {
  return useLiveQuery(async () => {
    if (!filters) {
      return undefined
    }
    const all = await db.transactions.toArray()
    return filterTransactions(all, {
      currency: filters.currency,
      cardId: filters.cardId,
      year: filters.year,
    })
  }, [filters?.currency, filters?.cardId, filters?.year])
}
