import { X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import type { FilterSelectOption } from '@/components/shell/FilterSelect'
import TransactionsTable from '@/components/transactions/TransactionsTable'
import TransactionsToolbar from '@/components/transactions/TransactionsToolbar'
import { useDashboardFilters } from '@/hooks/DashboardFiltersContext'
import { useDashboardSummary } from '@/hooks/useDashboardSummary'
import { useFilteredTransactions } from '@/hooks/useFilteredTransactions'
import type { StandardTransaction } from '@/types/transaction'
import { categoryMergeKey, displayCategoryLabel } from '@/utils/category'
import { formatUtcDate, formatUtcDateKey, getUtcDateKey } from '@/utils/dates'

const ALL_STATUSES = 'all'
const ALL_CATEGORIES = 'all'
const ALL_MODES = 'all'

const MODE_LABELS: Record<string, string> = {
  'Direct Pay': 'Direct',
  'Borrow Mode': 'Borrow',
}

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
 * respects; search and the status/category/spending mode dropdowns here
 * narrow that set further, they don't replace it.
 */
function TransactionsPage() {
  const overallSummary = useDashboardSummary()
  const { filters, options, clearDay } = useDashboardFilters()
  const transactions = useFilteredTransactions(filters)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState(ALL_STATUSES)
  const [mode, setMode] = useState(ALL_MODES)
  // The category filter lives in the URL (?category=<key>) rather than in
  // local state, so the Dashboard's category breakdown can link straight to
  // one category's transactions, and the back button returns there.
  const [searchParams, setSearchParams] = useSearchParams()
  const category = searchParams.get('category') ?? ALL_CATEGORIES
  function setCategory(value: string) {
    setSearchParams(
      (previous) => {
        const next = new URLSearchParams(previous)
        if (value === ALL_CATEGORIES) {
          next.delete('category')
        } else {
          next.set('category', value)
        }
        return next
      },
      { replace: true },
    )
  }

  // Set by picking a day on the Dashboard's activity heatmap (MVP-PLAN §5);
  // narrows the already currency/card/period-scoped set further, the same
  // way search and the dropdowns below do.
  const period = filters?.period
  const selectedDateKey =
    period?.kind === 'month' && period.day !== undefined
      ? formatUtcDateKey(period.year, period.month, period.day)
      : null

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

  // Only the modes actually present, like the status list, so there's no
  // Borrow option to pick for someone who has never used Borrow Mode.
  // Direct first, as the everyday one.
  const modeOptions = useMemo<FilterSelectOption[]>(() => {
    const present = new Set((transactions ?? []).map((transaction) => transaction.spendingMode))
    return [
      { value: ALL_MODES, label: 'Direct and Borrow' },
      ...Object.entries(MODE_LABELS)
        .filter(([value]) => present.has(value as StandardTransaction['spendingMode']))
        .map(([value, label]) => ({ value, label })),
    ]
  }, [transactions])

  const categoryOptions = useMemo<FilterSelectOption[]>(() => {
    // ether.fi's export mixes MCC-coded and bare variants of what's
    // otherwise the same category (e.g. "5411 - Grocery Stores and
    // Supermarkets" alongside plain "Grocery Stores and Supermarkets");
    // grouped here by merge key so they show up as one option, not two,
    // and shown without the code either way.
    const labelByKey = new Map<string, string>()
    for (const transaction of transactions ?? []) {
      const key = categoryMergeKey(transaction.categoryRaw)
      labelByKey.set(key, displayCategoryLabel(transaction.categoryRaw))
    }
    const options = [...labelByKey.entries()]
      .map(([value, label]) => ({ value, label }))
      .sort((a, b) => a.label.localeCompare(b.label))
    return [{ value: ALL_CATEGORIES, label: 'All categories' }, ...options]
  }, [transactions])

  const visibleTransactions = useMemo(() => {
    if (!transactions) {
      return []
    }
    const query = search.trim().toLowerCase()
    return transactions
      .filter((transaction) => status === ALL_STATUSES || transaction.status === status)
      .filter((transaction) => mode === ALL_MODES || transaction.spendingMode === mode)
      .filter(
        (transaction) =>
          category === ALL_CATEGORIES || categoryMergeKey(transaction.categoryRaw) === category,
      )
      .filter((transaction) => matchesSearch(transaction, query))
      .filter(
        (transaction) =>
          !selectedDateKey || getUtcDateKey(transaction.timestampUtc) === selectedDateKey,
      )
      .sort((a, b) => b.timestampUtc.localeCompare(a.timestampUtc))
  }, [transactions, search, status, mode, category, selectedDateKey])

  if (overallSummary === undefined) {
    return <p className="text-sm text-muted-foreground">Loading...</p>
  }

  if (overallSummary.transactionCount === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Import your ether.fi export to see transactions here.
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
        mode={mode}
        modeOptions={modeOptions}
        onModeChange={setMode}
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
