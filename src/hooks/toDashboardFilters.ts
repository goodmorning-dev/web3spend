import type { DashboardFilters } from '@/analyzers'
import type { SelectedFilters } from './DashboardFiltersContext'

/** The currency/card/period part of the selection, in the shape
 * filterTransactions takes. A picked day isn't included: views that honor
 * it narrow to it themselves. Kept out of DashboardFiltersContext.tsx so
 * that file only exports components and hooks (fast refresh). */
export function toDashboardFilters({
  currency,
  cardId,
  period,
}: SelectedFilters): DashboardFilters {
  return {
    currency,
    cardId,
    year: period.kind === 'month' ? period.year : undefined,
    month: period.kind === 'month' ? period.month : undefined,
  }
}
