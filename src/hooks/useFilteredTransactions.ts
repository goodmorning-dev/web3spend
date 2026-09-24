import { useLiveQuery } from 'dexie-react-hooks'
import { filterTransactions } from '@/analyzers'
import { db } from '@/storage/db'
import type { StandardTransaction } from '@/types/transaction'
import type { SelectedFilters } from './DashboardFiltersContext'
import { toDashboardFilters } from './toDashboardFilters'
import { useDataSource } from './useDataSource'

/**
 * The shared data source for every dashboard view (KPIs, charts, heatmap,
 * transaction table): all transactions matching the currently selected
 * currency/card/period, per MVP-PLAN §5 ("these controls apply consistently
 * to every summary, chart, and transaction list"). Live so a fresh import
 * or a filter change updates every consumer immediately.
 */
export function useFilteredTransactions(
  filters: SelectedFilters | null,
): StandardTransaction[] | undefined {
  const source = useDataSource()
  return useLiveQuery(async () => {
    if (!filters) {
      return undefined
    }
    const all = await db.transactions.toArray()
    return filterTransactions(all, toDashboardFilters(filters))
  }, [filters, source])
}
