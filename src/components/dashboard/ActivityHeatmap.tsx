import type { DayActivity } from '@/analyzers'
import { formatMoney } from '@/utils/format'

interface ActivityHeatmapProps {
  activity: DayActivity[]
  year: number
  currency: string
}

const CELL = 11
const GAP = 3
const STEP = CELL + GAP
const PAD_LEFT = 28
const PAD_TOP = 16
const LEVEL_OPACITY = [1, 0.28, 0.52, 0.76, 1]
const WEEKDAY_LABELS = ['', 'Mon', '', 'Wed', '', 'Fri', '']
const MONTH_LABELS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
]

/**
 * TECHNICAL-PLAN §9: a GitHub-contribution-style year grid, one cell per
 * calendar day, shaded by `computeYearActivity`'s quantile level for that
 * day. Weeks run left to right as columns, Sunday to Saturday as rows, the
 * same layout convention GitHub itself uses.
 */
function ActivityHeatmap({ activity, year, currency }: ActivityHeatmapProps) {
  const jan1Weekday = new Date(Date.UTC(year, 0, 1)).getUTCDay()
  const weeks = Math.ceil((activity.length + jan1Weekday) / 7)
  const width = PAD_LEFT + weeks * STEP
  const height = PAD_TOP + 7 * STEP

  const monthStarts = activity
    .map((day, index) => ({ day, index }))
    .filter(({ day }) => day.key.endsWith('-01'))
    .map(({ day, index }) => ({
      label: MONTH_LABELS[Number(day.key.split('-')[1]) - 1],
      column: Math.floor((index + jan1Weekday) / 7),
    }))

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="font-heading text-sm font-semibold">Activity</h3>
        <div className="flex items-center gap-1.5 text-[11px] font-medium text-text-faint">
          <span>Less</span>
          {LEVEL_OPACITY.map((opacity, level) => (
            <span
              key={level}
              className="size-2.5 rounded-[3px]"
              style={
                level === 0
                  ? { backgroundColor: 'var(--color-border)' }
                  : { backgroundColor: 'var(--color-primary)', opacity }
              }
            />
          ))}
          <span>More</span>
        </div>
      </div>
      <div className="overflow-x-auto">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          width={width}
          height={height}
          role="img"
          aria-label={`Calendar heatmap of daily spending in ${year}, shaded by amount spent that day`}
        >
          {monthStarts.map(({ column, label }) => (
            <text
              key={`${label}-${column}`}
              x={PAD_LEFT + column * STEP}
              y={PAD_TOP - 5}
              className="fill-text-faint text-[9px] font-medium"
            >
              {label}
            </text>
          ))}
          {WEEKDAY_LABELS.map((label, row) =>
            label ? (
              <text
                key={label}
                x={PAD_LEFT - 6}
                y={PAD_TOP + row * STEP + CELL - 2}
                textAnchor="end"
                className="fill-text-faint text-[9px] font-medium"
              >
                {label}
              </text>
            ) : null,
          )}
          {activity.map((day, index) => {
            const column = Math.floor((index + jan1Weekday) / 7)
            const row = (index + jan1Weekday) % 7
            return (
              <rect
                key={day.key}
                x={PAD_LEFT + column * STEP}
                y={PAD_TOP + row * STEP}
                width={CELL}
                height={CELL}
                rx={3}
                fill={day.level === 0 ? 'var(--color-border)' : 'var(--color-primary)'}
                fillOpacity={LEVEL_OPACITY[day.level]}
              >
                <title>
                  {day.key}:{' '}
                  {day.spendMinor > 0 ? formatMoney(day.spendMinor, currency) : 'No spend'}
                </title>
              </rect>
            )
          })}
        </svg>
      </div>
    </div>
  )
}

export default ActivityHeatmap
