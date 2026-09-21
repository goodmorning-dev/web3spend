import { X } from 'lucide-react'
import { useMemo, useState } from 'react'
import type { FilterSelectOption } from '@/components/shell/FilterSelect'
import TransactionsTable from '@/components/transactions/TransactionsTable'
import TransactionsToolbar from '@/components/transactions/TransactionsToolbar'
import { useDashboardFilters } from '@/hooks/DashboardFiltersContext'
import { useDashboardSummary } from '@/hooks/useDashboardSummary'
import { useFilteredTransactions } from '@/hooks/useFilteredTransactions'
import type { StandardTransaction } from '@/types/transaction'
import { formatUtcDate, formatUtcDateKey, getUtcDateKey } from '@/utils/dates'

const ALL_STATUSES = 'all'
const ALL_CATEGORIES = 'all'

const STATUS_LABELS: Record<string, string> = {
  CLEARED: 'Cleared',
  PENDING: 'Pending',
  CANCELLED: 'Cancelled',
  UNKNOWN: 'Unknown',
}

function distinctSorted(values: string[]): string[] {
  return [...new Set(values)].sort()
}

function matchesSearch(transaction: StandardTransaction, query: string): boolean {
  return query === '' || transaction.description.toLowerCase().includes(query)
}

/**
 * MVP-PLAN §5: the searchable, filterable transaction list, still scoped to
 * the shared currency/card/period filters everywhere else on the dashboard
 * respects; search and the status/category dropdowns here narrow that set
 * further, they don't replace it.
 */
function TransactionsPage() {
  const overallSummary = useDashboardSummary()
  const { filters, options, clearDay } = useDashboardFilters()
  const transactions = useFilteredTransactions(filters)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState(ALL_STATUSES)
  const [category, setCategory] = useState(ALL_CATEGORIES)

  // Set by picking a day on the Dashboard's activity heatmap (MVP-PLAN §5);
  // narrows the already currency/card/period-scoped set further, the same
  // way search and the dropdowns below do.
  const selectedDateKey =
    filters?.day !== undefined ? formatUtcDateKey(filters.year, filters.month, filters.day) : null

  const cardLastFourById = useMemo(() => {
    const map = new Map<string, string>()
    for (const card of options?.cards ?? []) {
      map.set(card.id, card.last4)
    }
    return map
  }, [options])

  const statusOptions = useMemo<FilterSelectOption[]>(() => {
    const statuses = distinctSorted((transactions ?? []).map((transaction) => transaction.status))
    return [
      { value: ALL_STATUSES, label: 'All statuses' },
      ...statuses.map((value) => ({ value, label: STATUS_LABELS[value] ?? value })),
    ]
  }, [transactions])

  const categoryOptions = useMemo<FilterSelectOption[]>(() => {
    const categories = distinctSorted(
      (transactions ?? []).map((transaction) => transaction.categoryRaw),
    )
    return [
      { value: ALL_CATEGORIES, label: 'All categories' },
      ...categories.map((value) => ({ value, label: value })),
    ]
  }, [transactions])

  const visibleTransactions = useMemo(() => {
    if (!transactions) {
      return []
    }
    const query = search.trim().toLowerCase()
    return transactions
      .filter((transaction) => status === ALL_STATUSES || transaction.status === status)
      .filter((transaction) => category === ALL_CATEGORIES || transaction.categoryRaw === category)
      .filter((transaction) => matchesSearch(transaction, query))
      .filter(
        (transaction) =>
          !selectedDateKey || getUtcDateKey(transaction.timestampUtc) === selectedDateKey,
      )
      .sort((a, b) => b.timestampUtc.localeCompare(a.timestampUtc))
  }, [transactions, search, status, category, selectedDateKey])

  if (overallSummary === undefined) {
    return <p className="text-sm text-muted-foreground">Loading...</p>
  }

  if (overallSummary.transactionCount === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Import your Etherfi export to see transactions here.
      </p>
    )
  }

  if (!filters || transactions === undefined) {
    return <p className="text-sm text-muted-foreground">Loading...</p>
  }

  return (
    <div className="flex flex-col gap-4">
      {selectedDateKey && (
        <div className="flex items-center gap-1.5 self-start rounded-full border border-border bg-secondary py-1 pr-1.5 pl-3 text-xs font-medium text-secondary-foreground">
          <span>Day: {formatUtcDate(`${selectedDateKey}T00:00:00.000Z`)}</span>
          <button
            type="button"
            onClick={clearDay}
            aria-label="Clear day filter"
            className="flex size-4 items-center justify-center rounded-full text-text-faint hover:bg-muted hover:text-foreground"
          >
            <X className="size-3" />
          </button>
        </div>
      )}
      <TransactionsToolbar
        search={search}
        onSearchChange={setSearch}
        status={status}
        statusOptions={statusOptions}
        onStatusChange={setStatus}
        category={category}
        categoryOptions={categoryOptions}
        onCategoryChange={setCategory}
      />
      <section className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4">
        <div>
          <h3 className="font-heading text-sm font-semibold">All transactions</h3>
          <p className="text-[11.5px] font-medium text-text-faint">
            {visibleTransactions.length}{' '}
            {visibleTransactions.length === 1 ? 'transaction' : 'transactions'} found
          </p>
        </div>
        <TransactionsTable transactions={visibleTransactions} cardLastFourById={cardLastFourById} />
      </section>
    </div>
  )
}

export default TransactionsPage
