import { Info, Repeat } from 'lucide-react'
import { detectSubscriptions } from '@/analyzers'
import { useDashboardFilters } from '@/hooks/DashboardFiltersContext'
import { useCurrencyScopedTransactions } from '@/hooks/useCurrencyScopedTransactions'
import { useDashboardSummary } from '@/hooks/useDashboardSummary'
import { formatUtcMonthLabel } from '@/utils/dates'
import { formatMoney } from '@/utils/format'

function monthLabel(monthKey: string): string {
  const [year, month] = monthKey.split('-').map(Number)
  return formatUtcMonthLabel(year, month)
}

interface SubscriptionCardProps {
  description: string
  currency: string
  amountMinor: number
  dayOfMonth: number
  occurrenceCount: number
  firstMonthKey: string
  lastMonthKey: string
}

function SubscriptionCard({
  description,
  currency,
  amountMinor,
  dayOfMonth,
  occurrenceCount,
  firstMonthKey,
  lastMonthKey,
}: SubscriptionCardProps) {
  return (
    <li className="flex items-center gap-3.5 rounded-2xl border border-border bg-card p-4">
      <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
        <Repeat className="size-5" />
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <p className="truncate text-sm font-semibold">{description}</p>
        <p className="text-xs text-text-faint">
          Day {dayOfMonth} of the month · {occurrenceCount} charge
          {occurrenceCount === 1 ? '' : 's'} ·{' '}
          {firstMonthKey === lastMonthKey
            ? monthLabel(firstMonthKey)
            : `${monthLabel(firstMonthKey)} – ${monthLabel(lastMonthKey)}`}
        </p>
      </div>
      <span className="shrink-0 text-right text-sm font-semibold tabular-nums">
        {formatMoney(amountMinor, currency)}
      </span>
    </li>
  )
}

/**
 * A heuristic list of likely recurring charges: the same merchant charging
 * the same amount on the same day of the month, at least twice (see
 * detectSubscriptions). This is a guess built from a pattern in the data,
 * not something Etherfi or any card network actually labels as a
 * subscription, so the disclaimer above the list isn't boilerplate - it's
 * the one thing that keeps this feature honest about what it can and can't
 * know.
 */
function SubscriptionsPage() {
  const overallSummary = useDashboardSummary()
  const { filters } = useDashboardFilters()
  const transactions = useCurrencyScopedTransactions(filters)

  if (overallSummary === undefined) {
    return <p className="text-sm text-muted-foreground">Loading...</p>
  }

  if (overallSummary.transactionCount === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Import your Etherfi export to see likely subscriptions here.
      </p>
    )
  }

  if (!filters || transactions === undefined) {
    return <p className="text-sm text-muted-foreground">Loading...</p>
  }

  const groups = detectSubscriptions(transactions)

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start gap-3 rounded-2xl border border-border bg-card p-4">
        <Info className="mt-0.5 size-4 shrink-0 text-text-faint" />
        <p className="text-sm text-text-dim">
          These are guesses, not confirmed subscriptions: any merchant that charged the same
          amount on the same day of the month at least twice shows up here, across your full
          history for this currency (the period filter above doesn't apply on this page). A
          coincidental repeat purchase can look like a subscription, and a real one that shifts by
          a day or skips a shorter month can be missed. Double-check anything you're not sure
          about.
        </p>
      </div>

      {groups.length === 0 ? (
        <p className="text-sm text-text-faint">
          No repeating charges found yet for {filters.currency}. A subscription needs at least two
          matching charges before it shows up here.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {groups.map((group) => (
            <SubscriptionCard
              key={`${group.description}-${group.currency}-${group.amountMinor}-${group.dayOfMonth}`}
              description={group.description}
              currency={group.currency}
              amountMinor={group.amountMinor}
              dayOfMonth={group.dayOfMonth}
              occurrenceCount={group.occurrences.length}
              firstMonthKey={group.occurrences[0].monthKey}
              lastMonthKey={group.occurrences[group.occurrences.length - 1].monthKey}
            />
          ))}
        </ul>
      )}
    </div>
  )
}

export default SubscriptionsPage
