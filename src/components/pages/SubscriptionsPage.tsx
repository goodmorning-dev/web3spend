import { ChevronDown } from 'lucide-react'
import { useId, useMemo } from 'react'
import {
  averageMonthlySpend,
  detectSubscriptions,
  isRecentlyCharged,
  nextChargeDate,
  RECENT_CHARGE_WINDOW_DAYS,
} from '@/analyzers'
import DetectionNote from '@/components/subscriptions/DetectionNote'
import { COLUMN_CLASS } from '@/components/subscriptions/columns'
import SubscriptionRow from '@/components/subscriptions/SubscriptionRow'
import SubscriptionSummary from '@/components/subscriptions/SubscriptionSummary'
import { useDashboardFilters } from '@/hooks/DashboardFiltersContext'
import { useCurrencyScopedTransactions } from '@/hooks/useCurrencyScopedTransactions'
import { useDashboardSummary } from '@/hooks/useDashboardSummary'
import { cn } from '@/lib/utils'

function ListHeader({ statusLabel }: { statusLabel: string }) {
  return (
    <div className="hidden items-center gap-4 border-y border-border px-5 py-2 text-[10px] font-semibold tracking-[0.06em] text-text-faint uppercase sm:flex">
      <span className="flex-1 pl-14">Subscription</span>
      <span className={COLUMN_CLASS.months}>Last 12 months</span>
      <span className={COLUMN_CLASS.paid}>Paid so far</span>
      <span className={COLUMN_CLASS.status}>{statusLabel}</span>
      <span className={COLUMN_CLASS.price}>Monthly</span>
      <span className="w-4 shrink-0" />
    </div>
  )
}

function CountBadge({ count, muted = false }: { count: number; muted?: boolean }) {
  return (
    <span
      className={cn(
        'shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-semibold tabular-nums',
        muted
          ? 'border-border bg-foreground/5 text-text-dim'
          : 'border-primary/30 bg-primary/15 text-primary',
      )}
    >
      {count}
    </span>
  )
}

/**
 * A heuristic list of likely recurring charges: the same merchant charging
 * the same amount on the same day of the month, at least twice (see
 * detectSubscriptions). Split into ones still charging and ones that went
 * quiet, relative to the newest transaction on record rather than today
 * (see isRecentlyCharged), with the summary cards above only counting the
 * former. DetectionNote keeps the "these are guesses" caveat on screen.
 */
function SubscriptionsPage() {
  const overallSummary = useDashboardSummary()
  const { filters, options } = useDashboardFilters()
  const transactions = useCurrencyScopedTransactions(filters)
  const activeHeadingId = useId()
  const stoppedHeadingId = useId()

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
        Import your ether.fi export to see likely subscriptions here.
      </p>
    )
  }

  if (!filters || transactions === undefined) {
    return <p className="text-sm text-muted-foreground">Loading...</p>
  }

  const now = new Date()
  const asOfUtc = overallSummary.latestTimestampUtc ?? now.toISOString()
  const groups = detectSubscriptions(transactions)
  const active = groups
    .filter((group) => isRecentlyCharged(group, asOfUtc))
    .sort((a, b) => nextChargeDate(a, now).getTime() - nextChargeDate(b, now).getTime())
  const inactive = groups.filter((group) => !isRecentlyCharged(group, asOfUtc))

  return (
    <div className="flex flex-col gap-4">
      <DetectionNote />

      {groups.length === 0 ? (
        <p className="rounded-2xl border border-border bg-card p-5 text-sm text-text-faint">
          No repeating charges found yet for {filters.currency}. A subscription needs at least two
          matching charges before it shows up here.
        </p>
      ) : (
        <>
          <SubscriptionSummary
            active={active}
            currency={filters.currency}
            now={now}
            average={averageMonthlySpend(transactions, asOfUtc)}
          />

          <section
            aria-labelledby={activeHeadingId}
            className="rounded-2xl border border-border bg-card"
          >
            <div className="flex items-center justify-between gap-3 px-4 pt-4 pb-3 sm:px-5">
              <div>
                <h3 id={activeHeadingId} className="font-heading text-sm font-semibold">
                  Active subscriptions
                </h3>
                <p className="text-[11.5px] font-medium text-text-faint">
                  Charged in the last {RECENT_CHARGE_WINDOW_DAYS} days, next renewal first
                </p>
              </div>
              <CountBadge count={active.length} />
            </div>
            {active.length === 0 ? (
              <p className="border-t border-border px-4 py-6 text-sm text-text-faint sm:px-5">
                Nothing has charged in the last {RECENT_CHARGE_WINDOW_DAYS} days. Anything that
                stopped is listed below.
              </p>
            ) : (
              <>
                <ListHeader statusLabel="Next charge" />
                <ul>
                  {active.map((group) => (
                    <SubscriptionRow
                      key={`${group.cardId}-${group.description}-${group.currency}-${group.amountMinor}-${group.dayOfMonth}`}
                      group={group}
                      asOfUtc={asOfUtc}
                      now={now}
                      isActive
                      cardLastFourById={cardLastFourById}
                    />
                  ))}
                </ul>
              </>
            )}
          </section>

          {inactive.length > 0 && (
            <details
              aria-labelledby={stoppedHeadingId}
              className="group/stopped subscription-details rounded-2xl border border-border bg-card"
            >
              <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-4 sm:px-5 [&::-webkit-details-marker]:hidden">
                <div className="flex min-w-0 flex-1 flex-col">
                  <h3 id={stoppedHeadingId} className="font-heading text-sm font-semibold">
                    No recent charge
                  </h3>
                  <p className="text-[11.5px] font-medium text-text-faint">
                    Nothing charged in the last {RECENT_CHARGE_WINDOW_DAYS} days. These may have
                    been cancelled.
                  </p>
                </div>
                <CountBadge count={inactive.length} muted />
                <ChevronDown className="size-4 shrink-0 text-text-faint transition-transform duration-200 group-open/stopped:rotate-180" />
              </summary>
              <ListHeader statusLabel="Last charge" />
              <ul>
                {inactive.map((group) => (
                  <SubscriptionRow
                    key={`${group.cardId}-${group.description}-${group.currency}-${group.amountMinor}-${group.dayOfMonth}`}
                    group={group}
                    asOfUtc={asOfUtc}
                    now={now}
                    isActive={false}
                    cardLastFourById={cardLastFourById}
                  />
                ))}
              </ul>
            </details>
          )}
        </>
      )}
    </div>
  )
}

export default SubscriptionsPage
