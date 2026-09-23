import type { SubscriptionMonth } from '@/analyzers'
import { cn } from '@/lib/utils'
import { formatUtcShortMonthLabel } from '@/utils/dates'

interface MonthStripProps {
  months: SubscriptionMonth[]
  /** Shown in a charged month's hover label, e.g. "€13.99". */
  amountLabel: string
  /** Set when the newest month hasn't charged yet but its usual day is
   * still ahead, e.g. "Sep 24", so it doesn't read as a skipped month. */
  upcomingLabel?: string
}

/**
 * One square per month, oldest first, in the activity heatmap's colors: gold
 * for a month the subscription charged in, the empty-day gray for one it
 * didn't, and a dashed outline for this month's charge when it's still to
 * come. Enough to see at a glance how long something has been running and
 * whether it ever skipped a month, without opening the row.
 */
function MonthStrip({ months, amountLabel, upcomingLabel }: MonthStripProps) {
  const chargedCount = months.filter((month) => month.charged).length

  return (
    <div
      role="img"
      aria-label={`Charged in ${chargedCount} of the last ${months.length} months`}
      className="flex items-center gap-1"
    >
      {months.map(({ year, month, charged }, index) => {
        const upcoming = !charged && upcomingLabel !== undefined && index === months.length - 1
        return (
          <span key={`${year}-${month}`} className="group/month relative py-1">
            <span
              className={cn(
                'block size-2.5 rounded-[3px] transition-transform duration-150 group-hover/month:scale-125',
                charged
                  ? 'bg-primary shadow-[0_0_8px_-2px_var(--color-primary)]'
                  : upcoming
                    ? 'border border-dashed border-primary/70'
                    : 'bg-border',
              )}
            />
            <span
              aria-hidden
              className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-1 -translate-x-1/2 translate-y-1 rounded-lg border border-border bg-secondary px-2 py-1 text-[11px] font-medium whitespace-nowrap text-foreground opacity-0 shadow-lg transition-[opacity,translate] duration-150 group-hover/month:translate-y-0 group-hover/month:opacity-100"
            >
              {formatUtcShortMonthLabel(year, month)}
              <span className="text-text-faint">
                : {charged ? amountLabel : upcoming ? `due ${upcomingLabel}` : 'no charge'}
              </span>
            </span>
          </span>
        )
      })}
    </div>
  )
}

export default MonthStrip
