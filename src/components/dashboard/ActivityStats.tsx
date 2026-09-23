import { CalendarCheck, CalendarDays, Flame, Trophy } from 'lucide-react'
import type { ComponentType } from 'react'
import type { ActivityStreak, YearActivitySummary } from '@/analyzers'
import { cn } from '@/lib/utils'
import { formatUtcMonthDay } from '@/utils/dates'
import { formatMoney } from '@/utils/format'

const WEEKDAY_PLURALS = [
  'Sundays',
  'Mondays',
  'Tuesdays',
  'Wednesdays',
  'Thursdays',
  'Fridays',
  'Saturdays',
]

// Layouts, keyed off the width of the Activity card's @container (see
// ActivityHeatmap), so they follow the space actually available:
//   under 560px:    under the grid, a compact list (phones)
//   560 to 1110px:  under the grid, four columns in a row
//   1110 to 1300px: beside the grid in ~200px, a compact list again
//   1300px and up:  beside the grid, a 2x2 block
// "List" puts each label on the left and its value on the right; "stacked"
// puts label, value and detail on top of each other.
const PANEL_CLASS =
  'flex flex-col gap-2.5 @min-[560px]:grid @min-[560px]:grid-cols-4 @min-[560px]:gap-x-6 @min-[560px]:gap-y-4 @min-[1110px]:flex @min-[1110px]:gap-2.5 @min-[1300px]:grid @min-[1300px]:grid-cols-2 @min-[1300px]:gap-y-4'
const STAT_CLASS =
  'flex items-start justify-between gap-3 @min-[560px]:flex-col @min-[560px]:justify-start @min-[560px]:gap-0.5 @min-[1110px]:flex-row @min-[1110px]:justify-between @min-[1110px]:gap-3 @min-[1300px]:flex-col @min-[1300px]:justify-start @min-[1300px]:gap-0.5'
const VALUE_GROUP_CLASS =
  'flex min-w-0 flex-col items-end text-right @min-[560px]:items-start @min-[560px]:text-left @min-[1110px]:items-end @min-[1110px]:text-right @min-[1300px]:items-start @min-[1300px]:text-left'

function plural(count: number, word: string): string {
  return `${count} ${word}${count === 1 ? '' : 's'}`
}

/** "Sep 17 to 20" within one month, "Aug 30 to Sep 2" across two. */
function streakRange({ length, startKey, endKey }: ActivityStreak): string {
  if (length === 1) {
    return formatUtcMonthDay(startKey)
  }
  const sameMonth = startKey.slice(0, 7) === endKey.slice(0, 7)
  const end = sameMonth ? String(Number(endKey.slice(8))) : formatUtcMonthDay(endKey)
  return `${formatUtcMonthDay(startKey)} to ${end}`
}

interface StatProps {
  icon: ComponentType<{ className?: string }>
  label: string
  value: string
  detail: string
}

function Stat({ icon: Icon, label, value, detail }: StatProps) {
  return (
    <div className={STAT_CLASS}>
      <span className="flex shrink-0 items-center gap-1.5 pt-0.5 text-[10px] font-semibold tracking-[0.06em] whitespace-nowrap text-text-faint uppercase">
        <Icon className="size-3.5 shrink-0 text-primary" />
        {label}
      </span>
      <span className={VALUE_GROUP_CLASS}>
        <span className="text-sm font-semibold tabular-nums">{value}</span>
        <span className="text-[11.5px] leading-snug text-text-faint">{detail}</span>
      </span>
    </div>
  )
}

interface ActivityStatsProps {
  summary: YearActivitySummary
  metric: 'spend' | 'count'
  currency: string
  className?: string
}

/**
 * Four headline facts next to (or, without room, under) the activity grid.
 * Active days and the longest streak are the same either way; the biggest
 * day and top weekday follow the grid's Spending / Transactions switch.
 */
function ActivityStats({ summary, metric, currency, className }: ActivityStatsProps) {
  const { activeDays, longestStreak } = summary
  const topWeekday = metric === 'spend' ? summary.topSpendWeekday : summary.topCountWeekday
  const highlightDay = metric === 'spend' ? summary.biggestSpendDay : summary.busiestDay

  return (
    <div className={cn(PANEL_CLASS, className)}>
      <Stat
        icon={CalendarCheck}
        label="Active days"
        value={plural(activeDays, 'day')}
        detail="with a purchase"
      />
      <Stat
        icon={Flame}
        label="Longest streak"
        value={plural(longestStreak?.length ?? 0, 'day')}
        detail={longestStreak ? streakRange(longestStreak) : 'no purchases yet'}
      />
      <Stat
        icon={Trophy}
        label={metric === 'spend' ? 'Biggest day' : 'Busiest day'}
        value={
          !highlightDay
            ? 'None yet'
            : metric === 'spend'
              ? formatMoney(highlightDay.spendMinor, currency)
              : plural(highlightDay.purchaseCount, 'transaction')
        }
        detail={highlightDay ? formatUtcMonthDay(highlightDay.key) : 'no purchases yet'}
      />
      <Stat
        icon={CalendarDays}
        label="Top weekday"
        value={topWeekday ? WEEKDAY_PLURALS[topWeekday.weekday] : 'None yet'}
        detail={
          !topWeekday
            ? 'no purchases yet'
            : metric === 'spend'
              ? `${formatMoney(Math.round(topWeekday.average), currency)} on average`
              : `${topWeekday.average.toFixed(1)} on average`
        }
      />
    </div>
  )
}

export default ActivityStats
