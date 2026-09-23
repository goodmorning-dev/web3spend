import { CalendarClock, CalendarRange, ChartPie, Wallet } from 'lucide-react'
import {
  daysUntil,
  nextChargeDate,
  RECENT_CHARGE_WINDOW_DAYS,
  type MonthlySpendAverage,
  type SubscriptionGroup,
} from '@/analyzers'
import KpiCard from '@/components/dashboard/KpiCard'
import { formatUtcDate, formatUtcShortMonthLabel } from '@/utils/dates'
import { formatMoney, formatPercent } from '@/utils/format'

interface SubscriptionSummaryProps {
  /** Only the subscriptions that charged recently; see isRecentlyCharged. */
  active: SubscriptionGroup[]
  currency: string
  now: Date
  average: MonthlySpendAverage | null
}

function relativeDay(days: number): string {
  return days === 0 ? 'today' : days === 1 ? 'tomorrow' : `in ${days} days`
}

function SubscriptionSummary({ active, currency, now, average }: SubscriptionSummaryProps) {
  const monthlyMinor = active.reduce((sum, group) => sum + group.amountMinor, 0)
  const activeCount = `${active.length} active subscription${active.length === 1 ? '' : 's'}`

  const upcoming = active
    .map((group) => ({ group, date: nextChargeDate(group, now) }))
    .sort((a, b) => a.date.getTime() - b.date.getTime())[0]

  const share =
    average && average.averageMinor > 0 ? (monthlyMinor / average.averageMinor) * 100 : null
  const averageRange = average
    ? average.from.year === average.to.year && average.from.month === average.to.month
      ? formatUtcShortMonthLabel(average.to.year, average.to.month)
      : `${formatUtcShortMonthLabel(average.from.year, average.from.month)} to ${formatUtcShortMonthLabel(average.to.year, average.to.month)}`
    : null

  return (
    <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 xl:grid-cols-4">
      <KpiCard
        icon={<Wallet className="size-5" />}
        label="Monthly cost"
        value={formatMoney(monthlyMinor, currency)}
        detail={activeCount}
        hint="latest charge of each active one, added up"
      />
      <KpiCard
        icon={<CalendarRange className="size-5" />}
        label="Per year"
        value={formatMoney(monthlyMinor * 12, currency)}
        detail="at the current rate"
        hint="monthly cost × 12, if nothing changes"
      />
      <KpiCard
        icon={<CalendarClock className="size-5" />}
        label="Next charge"
        value={upcoming ? upcoming.group.description : 'None'}
        detail={
          upcoming
            ? `${formatMoney(upcoming.group.amountMinor, currency)} ${relativeDay(daysUntil(upcoming.date, now))}`
            : 'nothing active right now'
        }
        hint={
          upcoming
            ? `expected on ${formatUtcDate(upcoming.date.toISOString())}`
            : `nothing has charged in the last ${RECENT_CHARGE_WINDOW_DAYS} days`
        }
      />
      <KpiCard
        icon={<ChartPie className="size-5" />}
        label="Share of spending"
        value={share === null ? 'Unavailable' : formatPercent(share, 0)}
        detail="of an average month"
        hint={
          average && averageRange
            ? `vs. ${formatMoney(average.averageMinor, currency)} average spend, ${averageRange}`
            : 'needs at least one full month of data'
        }
      />
    </div>
  )
}

export default SubscriptionSummary
