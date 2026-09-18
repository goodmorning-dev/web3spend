import { ChevronRight } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  aggregateByCategory,
  computeSpendTrend,
  computeYearActivity,
  summarizeTransactions,
} from '@/analyzers'
import ImportFlow from '@/components/ImportFlow'
import ActivityHeatmap from '@/components/dashboard/ActivityHeatmap'
import CategoryBreakdown from '@/components/dashboard/CategoryBreakdown'
import KpiRow from '@/components/dashboard/KpiRow'
import SpendChart from '@/components/dashboard/SpendChart'
import TransactionsTable from '@/components/transactions/TransactionsTable'
import { useDashboardFilters } from '@/hooks/DashboardFiltersContext'
import { useCurrencyScopedTransactions } from '@/hooks/useCurrencyScopedTransactions'
import { useDashboardSummary } from '@/hooks/useDashboardSummary'
import { useFilteredTransactions } from '@/hooks/useFilteredTransactions'
import { useYearFilteredTransactions } from '@/hooks/useYearFilteredTransactions'
import { formatUtcDate, formatUtcDateKey } from '@/utils/dates'

const RECENT_TRANSACTIONS_LIMIT = 6

/**
 * The Milestone 2 dashboard: KPIs, the spend trend and category charts, the
 * activity heatmap, and a recent-transactions preview, all scoped to the
 * shared currency/card/period filters (MVP-PLAN §5). Selecting a heatmap day
 * moves to the full transaction table on its own page, scoped to that day.
 */
function DashboardPage() {
  const navigate = useNavigate()
  const overallSummary = useDashboardSummary()
  const { filters, options, setDay } = useDashboardFilters()
  const filteredTransactions = useFilteredTransactions(filters)
  const yearFilteredTransactions = useYearFilteredTransactions(filters)
  const currencyScopedTransactions = useCurrencyScopedTransactions(filters)
  // Set once a file finishes processing in this component's lifetime, so a
  // first import's result (including any unsupported-row warnings) stays on
  // screen instead of being unmounted the instant `hasData` flips to true.
  const [justImported, setJustImported] = useState(false)

  const cardLastFourById = useMemo(() => {
    const map = new Map<string, string>()
    for (const card of options?.cards ?? []) {
      map.set(card.id, card.last4)
    }
    return map
  }, [options])

  const recentTransactions = useMemo(
    () =>
      [...(filteredTransactions ?? [])]
        .sort((a, b) => b.timestampUtc.localeCompare(a.timestampUtc))
        .slice(0, RECENT_TRANSACTIONS_LIMIT),
    [filteredTransactions],
  )

  const goToTransactions = () => navigate('/app/transactions')

  if (overallSummary === undefined) {
    return <p className="text-sm text-muted-foreground">Loading...</p>
  }

  const hasData = overallSummary.transactionCount > 0
  const periodDataReady =
    filters !== null &&
    filteredTransactions !== undefined &&
    yearFilteredTransactions !== undefined &&
    currencyScopedTransactions !== undefined

  if (hasData && !justImported && !periodDataReady) {
    return <p className="text-sm text-muted-foreground">Loading...</p>
  }

  return (
    <div className="flex flex-col gap-6">
      {hasData &&
        periodDataReady &&
        filters &&
        filteredTransactions &&
        yearFilteredTransactions &&
        currencyScopedTransactions && (
          <div className="flex flex-col gap-4">
            <KpiRow
              summary={summarizeTransactions(filteredTransactions)}
              currency={filters.currency}
            />
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.15fr_1fr]">
              <SpendChart
                trend={computeSpendTrend(currencyScopedTransactions, filters.year, filters.month)}
                currency={filters.currency}
              />
              <CategoryBreakdown
                buckets={aggregateByCategory(filteredTransactions)}
                currency={filters.currency}
                onViewAll={goToTransactions}
              />
            </div>
            <ActivityHeatmap
              activity={computeYearActivity(yearFilteredTransactions, filters.year)}
              year={filters.year}
              currency={filters.currency}
              selectedDateKey={
                filters.day ? formatUtcDateKey(filters.year, filters.month, filters.day) : null
              }
              onSelectDay={(year, month, day) => {
                setDay(year, month, day)
                navigate('/app/transactions')
              }}
            />
            <section className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4">
              <div className="flex items-baseline justify-between gap-3">
                <div>
                  <h3 className="font-heading text-sm font-semibold">Recent transactions</h3>
                  <p className="text-[11.5px] font-medium text-text-faint">
                    Cleared and pending Direct Pay purchases
                  </p>
                </div>
                <button
                  type="button"
                  onClick={goToTransactions}
                  className="inline-flex shrink-0 cursor-pointer items-center gap-1 text-xs font-semibold text-primary hover:underline"
                >
                  View all
                  <ChevronRight className="size-3.5" />
                </button>
              </div>
              <TransactionsTable
                transactions={recentTransactions}
                cardLastFourById={cardLastFourById}
              />
            </section>
            {overallSummary.latestImportedAt && (
              <p className="text-xs text-text-faint">
                Last import: {formatUtcDate(overallSummary.latestImportedAt)} (UTC).
              </p>
            )}
          </div>
        )}

      {(!hasData || justImported) && <ImportFlow onImported={() => setJustImported(true)} />}
    </div>
  )
}

export default DashboardPage
