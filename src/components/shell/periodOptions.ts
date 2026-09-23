import type { SelectedPeriod } from '@/hooks/DashboardFiltersContext'
import type { AvailablePeriod } from '@/hooks/useDashboardFilterOptions'
import { formatUtcMonthLabel, formatUtcShortMonthLabel } from '@/utils/dates'
import type { FilterSelectOption } from './FilterSelect'

/** The period select's value for a period. A picked day doesn't change it:
 * the select still shows the month the day is in. */
export function periodValue(period: SelectedPeriod): string {
  return period.kind === 'all' ? 'all' : `month:${period.year}-${period.month}`
}

export function parsePeriodValue(value: string): SelectedPeriod {
  if (value === 'all') {
    return { kind: 'all' }
  }
  const [year, month] = value.slice(6).split('-').map(Number)
  return { kind: 'month', year, month }
}

/** "All time", then every month that has transactions, most recent first.
 * `periods` must already be most recent first. `short` uses "Sep 2026"
 * instead of "September 2026", for the tight phone layout. */
export function periodOptions(
  periods: AvailablePeriod[],
  { short = false }: { short?: boolean } = {},
): FilterSelectOption[] {
  const monthLabel = short ? formatUtcShortMonthLabel : formatUtcMonthLabel
  return [
    { value: 'all', label: 'All time' },
    ...periods.map((period) => ({
      value: `month:${period.year}-${period.month}`,
      label: monthLabel(period.year, period.month),
    })),
  ]
}
