import { ChevronDown, Repeat } from 'lucide-react'
import {
  daysUntil,
  latestCharge,
  nextChargeDate,
  recentMonths,
  type SubscriptionGroup,
} from '@/analyzers'
import { cn } from '@/lib/utils'
import { displayCategoryLabel } from '@/utils/category'
import { formatUtcDate, formatUtcShortMonthLabel, getUtcMonth, getUtcYear } from '@/utils/dates'
import { formatMoney } from '@/utils/format'
import { COLUMN_CLASS } from './columns'
import MonthStrip from './MonthStrip'

function cardDisplay(cardLastFourById: Map<string, string>, cardId: string): string {
  const lastFour = cardLastFourById.get(cardId)
  return lastFour ? `•••• ${lastFour}` : 'Unknown card'
}

function shortMonthOf(timestampUtc: string): string {
  return formatUtcShortMonthLabel(getUtcYear(timestampUtc), getUtcMonth(timestampUtc))
}

function RenewalPill({ date, now }: { date: Date; now: Date }) {
  const days = daysUntil(date, now)
  const label =
    days === 0 ? 'Renews today' : days === 1 ? 'Renews tomorrow' : `Renews in ${days} days`
  const soon = days <= 3

  return (
    <span
      title={formatUtcDate(date.toISOString())}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11.5px] font-semibold whitespace-nowrap',
        soon
          ? 'border-primary/40 bg-primary/15 text-primary'
          : 'border-border bg-foreground/[0.03] text-text-dim',
      )}
    >
      {soon && <span className="size-1.5 animate-pulse rounded-full bg-primary" />}
      {label}
    </span>
  )
}

interface SubscriptionRowProps {
  group: SubscriptionGroup
  /** The newest timestamp in the imported data; see isRecentlyCharged. */
  asOfUtc: string
  now: Date
  /** false for a subscription with no recent charge: dimmed, and showing
   * when it last charged instead of a projected renewal. */
  isActive: boolean
  cardLastFourById: Map<string, string>
}

/** A `<details>` disclosure, same pattern as a transaction row's own
 * "Original amount" expand: collapsed by default so the list stays
 * scannable, but the exact charges behind a guess are one click away
 * rather than needing a trip to the Transactions tab and a manual search. */
function SubscriptionRow({
  group,
  asOfUtc,
  now,
  isActive,
  cardLastFourById,
}: SubscriptionRowProps) {
  const { description, currency, amountMinor, cardId, dayOfMonth, categoryRaw, occurrences } = group
  const amountLabel = formatMoney(amountMinor, currency)
  const latest = latestCharge(group)
  const newestFirst = [...occurrences].reverse()
  const months = recentMonths(group, asOfUtc)
  const newestMonth = months[months.length - 1]
  const nextCharge = isActive ? nextChargeDate(group, now) : null
  const upcomingLabel =
    nextCharge &&
    nextCharge.getUTCFullYear() === newestMonth.year &&
    nextCharge.getUTCMonth() + 1 === newestMonth.month
      ? nextCharge.toLocaleDateString(undefined, {
          month: 'short',
          day: 'numeric',
          timeZone: 'UTC',
        })
      : undefined

  const status = nextCharge ? (
    <RenewalPill date={nextCharge} now={now} />
  ) : (
    <span className="text-xs whitespace-nowrap text-text-faint">
      Last charged {shortMonthOf(latest)}
    </span>
  )

  return (
    <li className="border-b border-border/60 last:border-0">
      <details className="group/row subscription-details">
        <summary
          className={cn(
            'flex cursor-pointer list-none items-center gap-4 px-4 py-3.5 transition-[background-color,opacity] hover:bg-foreground/[0.025] sm:px-5 [&::-webkit-details-marker]:hidden',
            !isActive && 'opacity-60 hover:opacity-100',
          )}
        >
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-primary/30 bg-gradient-to-b from-primary/20 to-primary/5 text-primary">
            <Repeat className="size-[18px]" />
          </div>

          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <p className="truncate text-sm font-semibold">{description}</p>
            <p className="flex min-w-0 gap-1 text-xs text-text-faint">
              <span className="truncate">{displayCategoryLabel(categoryRaw)}</span>
              <span className="shrink-0">· {cardDisplay(cardLastFourById, cardId)}</span>
            </p>
            <div className="mt-1 sm:hidden">{status}</div>
          </div>

          <div className={COLUMN_CLASS.months}>
            <MonthStrip months={months} amountLabel={amountLabel} upcomingLabel={upcomingLabel} />
          </div>

          <div className={COLUMN_CLASS.paid}>
            <span className="text-sm font-semibold tabular-nums">
              {formatMoney(amountMinor * occurrences.length, currency)}
            </span>
            <span className="text-[11px] text-text-faint">
              since {shortMonthOf(occurrences[0].timestampUtc)}
            </span>
          </div>

          <div className={COLUMN_CLASS.status}>{status}</div>

          <div className={COLUMN_CLASS.price}>
            <span className="text-sm font-semibold tabular-nums">{amountLabel}</span>
            <span className="text-[11px] text-text-faint">per month</span>
          </div>

          <ChevronDown className="size-4 shrink-0 text-text-faint transition-transform duration-200 group-open/row:rotate-180" />
        </summary>

        <div className="px-4 pb-4 sm:pr-5 sm:pl-[76px]">
          <div className="rounded-xl border border-border bg-background/40">
            <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-2 text-[10px] font-semibold tracking-[0.06em] text-text-faint uppercase">
              <span>
                {occurrences.length} charge{occurrences.length === 1 ? '' : 's'}
              </span>
              <span>Day {dayOfMonth} of the month</span>
            </div>
            <ul>
              {newestFirst.map((occurrence) => (
                <li
                  key={occurrence.transactionId}
                  className="grid grid-cols-[1fr_auto_auto] items-center gap-4 border-b border-border/60 px-4 py-2 text-xs last:border-0"
                >
                  <span className="text-text-dim">{formatUtcDate(occurrence.timestampUtc)}</span>
                  <span className="text-text-faint">
                    {cardDisplay(cardLastFourById, occurrence.cardId)}
                  </span>
                  <span className="text-right font-medium tabular-nums">{amountLabel}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </details>
    </li>
  )
}

export default SubscriptionRow
