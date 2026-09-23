import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'
import { useDashboardFilterOptions, type DashboardFilterOptions } from './useDashboardFilterOptions'

/** The period every view under /app is scoped to: one month, one whole
 * year, or everything on record. */
export type SelectedPeriod =
  | { kind: 'all' }
  | { kind: 'year'; year: number }
  | {
      kind: 'month'
      year: number
      month: number
      /** Set by picking a day on the activity heatmap (MVP-PLAN §5:
       * "clicking a cell filters the transaction table to that day");
       * undefined means no narrowing beyond the month. */
      day?: number
    }

export interface SelectedFilters {
  currency: string
  cardId?: string
  period: SelectedPeriod
}

export interface DashboardFiltersContextValue {
  /** null while filter options are still loading, or there is no data to filter yet. */
  filters: SelectedFilters | null
  options: DashboardFilterOptions | undefined
  setCurrency: (currency: string) => void
  setCardId: (cardId: string | undefined) => void
  /** Changing the period directly is a broader "look at something else"
   * action, distinct from picking a day, so it also clears any day filter
   * rather than leaving a day selected that may no longer be in view. */
  setPeriod: (period: SelectedPeriod) => void
  /** The heatmap spans a full year, so a selected day can fall outside the
   * currently selected month; this moves the period to match it, keeping
   * the period control and the day filter always consistent with each
   * other. Currency and card selection are left untouched. */
  setDay: (year: number, month: number, day: number) => void
  clearDay: () => void
  /** Clears every override back to whatever the data itself defaults to.
   * A stale card/currency/period override survives on its own even once
   * the data it referred to is gone, so after deleting all local data a
   * caller must reset explicitly; otherwise a re-import that assigns new
   * card IDs would still get filtered by the deleted card's old ID and
   * silently appear empty. */
  resetFilters: () => void
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
      period: { kind: 'month', year: options.periods[0].year, month: options.periods[0].month },
    }
  }, [options])

  const filters = defaults ? { ...defaults, ...overrides } : null

  const value: DashboardFiltersContextValue = {
    filters,
    options,
    setCurrency: (currency) => setOverrides((prev) => ({ ...prev, currency })),
    setCardId: (cardId) => setOverrides((prev) => ({ ...prev, cardId })),
    setPeriod: (period) => setOverrides((prev) => ({ ...prev, period })),
    setDay: (year, month, day) =>
      setOverrides((prev) => ({ ...prev, period: { kind: 'month', year, month, day } })),
    clearDay: () =>
      setOverrides((prev) =>
        prev.period?.kind === 'month'
          ? { ...prev, period: { ...prev.period, day: undefined } }
          : prev,
      ),
    resetFilters: () => setOverrides({}),
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

/**
 * Same as `useDashboardFilters`, but returns null instead of throwing when
 * there is no provider. For callers reachable both inside and outside
 * `/app` (e.g. "Try a demo" on Home, which has no filters to reset, and on
 * the Import screen, which does).
 */
export function useDashboardFiltersOptional(): DashboardFiltersContextValue | null {
  return useContext(DashboardFiltersContext)
}
