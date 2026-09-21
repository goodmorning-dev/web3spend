import { ChevronDown, Info, Repeat } from 'lucide-react'
import { useMemo } from 'react'
import { detectSubscriptions, type SubscriptionGroup } from '@/analyzers'
import { useDashboardFilters } from '@/hooks/DashboardFiltersContext'
import { useCurrencyScopedTransactions } from '@/hooks/useCurrencyScopedTransactions'
import { useDashboardSummary } from '@/hooks/useDashboardSummary'
import { formatUtcDate, formatUtcMonthLabel } from '@/utils/dates'
import { formatMoney } from '@/utils/format'

function monthLabel(monthKey: string): string {
  const [year, month] = monthKey.split('-').map(Number)
  return formatUtcMonthLabel(year, month)
}

function cardDisplay(cardLastFourById: Map<string, string>, cardId: string): string {
  const lastFour = cardLastFourById.get(cardId)
  return lastFour ? `•••• ${lastFour}` : 'Unknown card'
}

interface SubscriptionCardProps {
  group: SubscriptionGroup
  cardLastFourById: Map<string, string>
}

/** A `<details>` disclosure, same pattern as a transaction row's own
 * "Original amount" expand: collapsed by default so the list stays
 * scannable, but the exact charges behind a guess are one click away
 * rather than needing a trip to the Transactions tab and a manual search. */
function SubscriptionCard({ group, cardLastFourById }: SubscriptionCardProps) {
  const { description, currency, amountMinor, dayOfMonth, occurrences } = group
  const firstMonthKey = occurrences[0].monthKey
  const lastMonthKey = occurrences[occurrences.length - 1].monthKey

  return (
    <li className="overflow-hidden rounded-2xl border border-border bg-card">
      <details className="group">
        <summary className="flex list-none cursor-pointer items-center gap-3.5 p-4 [&::-webkit-details-marker]:hidden">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
            <Repeat className="size-5" />
          </div>
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <p className="truncate text-sm font-semibold">{description}</p>
            <p className="text-xs text-text-faint">
              Day {dayOfMonth} of the month · {occurrences.length} charge
              {occurrences.length === 1 ? '' : 's'} ·{' '}
              {firstMonthKey === lastMonthKey
                ? monthLabel(firstMonthKey)
                : `${monthLabel(firstMonthKey)} – ${monthLabel(lastMonthKey)}`}
            </p>
          </div>
          <span className="shrink-0 text-right text-sm font-semibold tabular-nums">
            {formatMoney(amountMinor, currency)}
          </span>
          <ChevronDown className="size-4 shrink-0 text-text-faint transition-transform group-open:rotate-180" />
        </summary>
        <ul className="flex flex-col gap-2 border-t border-border px-4 py-3">
          {occurrences.map((occurrence) => (
            <li
              key={occurrence.transactionId}
              className="flex items-center justify-between gap-3 text-xs text-text-dim"
            >
              <span>{formatUtcDate(occurrence.timestampUtc)}</span>
              <span className="text-text-faint">
                {cardDisplay(cardLastFourById, occurrence.cardId)}
              </span>
              <span className="tabular-nums">{formatMoney(amountMinor, currency)}</span>
            </li>
          ))}
        </ul>
      </details>
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
  const { filters, options } = useDashboardFilters()
  const transactions = useCurrencyScopedTransactions(filters)

  const cardLastFourById = useMemo(() => {
    const map = new Map<string, string>()
    for (const card of options?.cards ?? []) {
      map.set(card.id, card.last4)
    }
    return map
  }, [options])

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
              group={group}
              cardLastFourById={cardLastFourById}
            />
          ))}
        </ul>
      )}
    </div>
  )
}

export default SubscriptionsPage
