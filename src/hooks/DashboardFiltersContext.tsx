import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'
import { useDashboardFilterOptions, type DashboardFilterOptions } from './useDashboardFilterOptions'

export interface SelectedFilters {
  currency: string
  cardId?: string
  year: number
  month: number
}

export interface DashboardFiltersContextValue {
  /** null while filter options are still loading, or there is no data to filter yet. */
  filters: SelectedFilters | null
  options: DashboardFilterOptions | undefined
  setCurrency: (currency: string) => void
  setCardId: (cardId: string | undefined) => void
  setPeriod: (year: number, month: number) => void
}

const DashboardFiltersContext = createContext<DashboardFiltersContextValue | null>(null)

/**
 * Owns the currently selected currency/card/period for everything under
 * /app (MVP-PLAN §5: these controls apply consistently to every summary,
 * chart, and transaction list). Defaults come from whatever data actually
 * exists, so there's nothing to pick from an empty currency or period list.
 */
export function DashboardFiltersProvider({ children }: { children: ReactNode }) {
  const options = useDashboardFilterOptions()
  const [overrides, setOverrides] = useState<Partial<SelectedFilters>>({})

  const defaults = useMemo<SelectedFilters | null>(() => {
    if (!options || options.currencies.length === 0 || options.periods.length === 0) {
      return null
    }
    return {
      currency: options.currencies[0],
      cardId: undefined,
      year: options.periods[0].year,
      month: options.periods[0].month,
    }
  }, [options])

  const filters = defaults ? { ...defaults, ...overrides } : null

  const value: DashboardFiltersContextValue = {
    filters,
    options,
    setCurrency: (currency) => setOverrides((prev) => ({ ...prev, currency })),
    setCardId: (cardId) => setOverrides((prev) => ({ ...prev, cardId })),
    setPeriod: (year, month) => setOverrides((prev) => ({ ...prev, year, month })),
  }

  return (
    <DashboardFiltersContext.Provider value={value}>{children}</DashboardFiltersContext.Provider>
  )
}

export function useDashboardFilters(): DashboardFiltersContextValue {
  const context = useContext(DashboardFiltersContext)
  if (!context) {
    throw new Error('useDashboardFilters must be used within a DashboardFiltersProvider')
  }
  return context
}
