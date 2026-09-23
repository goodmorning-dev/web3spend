import { ChevronRight } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  aggregateByCategory,
  bucketByMonthRange,
  computeSpendTrend,
  computeYearActivity,
  summarizeTransactions,
} from '@/analyzers'
import ImportFlow from '@/components/ImportFlow'
import ActivityHeatmap from '@/components/dashboard/ActivityHeatmap'
import CategoryBreakdown from '@/components/dashboard/CategoryBreakdown'
import KpiRow from '@/components/dashboard/KpiRow'
import MonthlySpendChart from '@/components/dashboard/MonthlySpendChart'
import SpendChart from '@/components/dashboard/SpendChart'
import TransactionsTable from '@/components/transactions/TransactionsTable'
import { useDashboardFilters } from '@/hooks/DashboardFiltersContext'
import { useCurrencyScopedTransactions } from '@/hooks/useCurrencyScopedTransactions'
import { useDashboardSummary } from '@/hooks/useDashboardSummary'
import { useFilteredTransactions } from '@/hooks/useFilteredTransactions'
import type { StandardTransaction } from '@/types/transaction'
import { formatUtcDate, formatUtcDateKey, getUtcYear } from '@/utils/dates'

const RECENT_TRANSACTIONS_LIMIT = 6

/** The latest year anything in `transactions` falls in, for the heatmap on
 * "All time"; the current year when there's nothing to go by. */
function latestYear(transactions: StandardTransaction[]): number {
  return transactions.reduce(
    (latest, transaction) => Math.max(latest, getUtcYear(transaction.timestampUtc)),
    transactions.length > 0 ? 0 : new Date().getUTCFullYear(),
  )
}

/**
 * The Milestone 2 dashboard: KPIs, the spend trend and category charts, the
 * activity heatmap, and a recent-transactions preview, all scoped to the
 * shared currency/card/period filters (MVP-PLAN §5). Selecting a heatmap day
 * moves to the full transaction table on its own page, scoped to that day.
 */
function DashboardPage() {
  const navigate = useNavigate()
  const overallSummary = useDashboardSummary()
  const { filters, options, setDay, clearDay } = useDashboardFilters()
  const filteredTransactions = useFilteredTransactions(filters)
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
    currencyScopedTransactions !== undefined

  if (hasData && !justImported && !periodDataReady) {
    return <p className="text-sm text-muted-foreground">Loading...</p>
  }

  // The heatmap always shows one calendar year: the selected month's, or
  // on "All time" the latest year with data for this currency/card.
  const period = filters?.period
  const heatmapYear =
    period?.kind === 'month' ? period.year : latestYear(currencyScopedTransactions ?? [])
  const heatmapTransactions = (currencyScopedTransactions ?? []).filter(
    (transaction) => getUtcYear(transaction.timestampUtc) === heatmapYear,
  )
  const selectedDateKey =
    period?.kind === 'month' && period.day !== undefined
      ? formatUtcDateKey(period.year, period.month, period.day)
      : null

  return (
    <div className="flex flex-col gap-6">
      {hasData &&
        periodDataReady &&
        filters &&
        filteredTransactions &&
        currencyScopedTransactions && (
          <div className="flex flex-col gap-4">
            <KpiRow
              summary={summarizeTransactions(filteredTransactions)}
              currency={filters.currency}
            />
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.15fr_1fr]">
              {/* The cumulative this-month-against-last-month comparison only
                  makes sense for one month; "All time" gets a bar per month
                  instead. */}
              {filters.period.kind === 'month' ? (
                <SpendChart
                  trend={computeSpendTrend(
                    currencyScopedTransactions,
                    filters.period.year,
                    filters.period.month,
                  )}
                  currency={filters.currency}
                />
              ) : (
                <MonthlySpendChart
                  buckets={bucketByMonthRange(filteredTransactions)}
                  currency={filters.currency}
                  periodLabel="All time"
                />
              )}
              <CategoryBreakdown
                buckets={aggregateByCategory(filteredTransactions)}
                currency={filters.currency}
                onViewAll={goToTransactions}
                onSelectCategory={(key) => {
                  // A day picked on the heatmap would otherwise narrow the
                  // list further than the category the viewer just asked for.
                  clearDay()
                  navigate({
                    pathname: '/app/transactions',
                    search: `?${new URLSearchParams({ category: key })}`,
                  })
                }}
              />
            </div>
            <ActivityHeatmap
              activity={computeYearActivity(heatmapTransactions, heatmapYear)}
              year={heatmapYear}
              currency={filters.currency}
              selectedDateKey={selectedDateKey}
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
                    Cleared and pending purchases
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
