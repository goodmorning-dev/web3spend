import { useMemo, useState } from 'react'
import type { FilterSelectOption } from '@/components/shell/FilterSelect'
import TransactionsTable from '@/components/transactions/TransactionsTable'
import TransactionsToolbar from '@/components/transactions/TransactionsToolbar'
import { useDashboardFilters } from '@/hooks/DashboardFiltersContext'
import { useDashboardSummary } from '@/hooks/useDashboardSummary'
import { useFilteredTransactions } from '@/hooks/useFilteredTransactions'
import type { StandardTransaction } from '@/types/transaction'

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
  const { filters, options } = useDashboardFilters()
  const transactions = useFilteredTransactions(filters)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState(ALL_STATUSES)
  const [category, setCategory] = useState(ALL_CATEGORIES)

  const cardLabelById = useMemo(() => {
    const map = new Map<string, string>()
    for (const card of options?.cards ?? []) {
      map.set(card.id, card.label)
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
      .sort((a, b) => b.timestampUtc.localeCompare(a.timestampUtc))
  }, [transactions, search, status, category])

  if (overallSummary === undefined) {
    return <p className="text-sm text-muted-foreground">Loading...</p>
  }

  if (overallSummary.transactionCount === 0) {
    return (
      <div className="flex flex-col gap-2">
        <h1 className="font-heading text-xl font-semibold">Transactions</h1>
        <p className="text-sm text-muted-foreground">
          Import your Etherfi export to see transactions here.
        </p>
      </div>
    )
  }

  if (!filters || transactions === undefined) {
    return <p className="text-sm text-muted-foreground">Loading...</p>
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="font-heading text-xl font-semibold">Transactions</h1>
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
      <TransactionsTable transactions={visibleTransactions} cardLabelById={cardLabelById} />
    </div>
  )
}

export default TransactionsPage
