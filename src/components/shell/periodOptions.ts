import type { SelectedPeriod } from '@/hooks/DashboardFiltersContext'
import type { AvailablePeriod } from '@/hooks/useDashboardFilterOptions'
import { formatUtcMonthLabel } from '@/utils/dates'
import type { FilterSelectOption } from './FilterSelect'

/** The period select's value for a period. A picked day doesn't change it:
 * the select still shows the month the day is in. */
export function periodValue(period: SelectedPeriod): string {
  switch (period.kind) {
    case 'all':
      return 'all'
    case 'year':
      return `year:${period.year}`
    case 'month':
      return `month:${period.year}-${period.month}`
  }
}

export function parsePeriodValue(value: string): SelectedPeriod {
  if (value === 'all') {
    return { kind: 'all' }
  }
  if (value.startsWith('year:')) {
    return { kind: 'year', year: Number(value.slice(5)) }
  }
  const [year, month] = value.slice(6).split('-').map(Number)
  return { kind: 'month', year, month }
}

/**
 * "All time", then each year (only when the data spans more than one, since
 * otherwise a year would just repeat "All time"), then every month on
 * record, most recent first. `periods` must already be most recent first.
 */
export function periodOptions(periods: AvailablePeriod[]): FilterSelectOption[] {
  const years = [...new Set(periods.map((period) => period.year))]
  return [
    { value: 'all', label: 'All time' },
    ...(years.length > 1
      ? years.map((year) => ({ value: `year:${year}`, label: `All of ${year}` }))
      : []),
    ...periods.map((period) => ({
      value: `month:${period.year}-${period.month}`,
      label: formatUtcMonthLabel(period.year, period.month),
    })),
  ]
}
