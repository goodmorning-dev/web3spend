import { useEffect, useRef, useState } from 'react'
import type { DayActivity } from '@/analyzers'
import { formatUtcDate } from '@/utils/dates'
import { formatMoney } from '@/utils/format'

interface ActivityHeatmapProps {
  activity: DayActivity[]
  year: number
  currency: string
  /** `DayActivity.key` ("YYYY-MM-DD") of the currently selected day, if any;
   * only ever a day within `year` (see DashboardFiltersContext.setDay). */
  selectedDateKey?: string | null
  onSelectDay: (year: number, month: number, day: number) => void
}

const CELL = 13
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

function parseDateKey(key: string): [number, number, number] {
  const [year, month, day] = key.split('-').map(Number)
  return [year, month, day]
}

/**
 * TECHNICAL-PLAN §9 / MVP-PLAN §5: a GitHub-contribution-style year grid,
 * one cell per calendar day, shaded by `computeYearActivity`'s quantile
 * level for that day. Weeks run left to right as columns, Sunday to
 * Saturday as rows, the same layout convention GitHub itself uses.
 * Selecting a day (click, tap, or keyboard) filters the transaction table
 * to it; the grid itself is a single tab stop, with arrow keys moving a
 * virtual focus between cells (the same roving-focus pattern a native grid
 * widget uses), so the page doesn't need 365 individual tab stops.
 */
function ActivityHeatmap({
  activity,
  year,
  currency,
  selectedDateKey = null,
  onSelectDay,
}: ActivityHeatmapProps) {
  const selectedIndex = selectedDateKey
    ? activity.findIndex((day) => day.key === selectedDateKey)
    : -1
  const [focusedIndex, setFocusedIndex] = useState(() => Math.max(selectedIndex, 0))
  const [hasFocus, setHasFocus] = useState(false)
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)
  const clearHoverTimeout = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  useEffect(() => () => clearTimeout(clearHoverTimeout.current), [])

  // The 3px gap between cells means a mouse moving between two adjacent
  // ones briefly crosses neither, firing a mouseleave right before the
  // next mouseenter; clearing the hover immediately made the tooltip pop
  // in and out at every cell boundary. Deferring the clear briefly, and
  // cancelling it if a new cell is hovered in that window, keeps it
  // visible through a continuous move instead.
  function hoverDay(index: number) {
    clearTimeout(clearHoverTimeout.current)
    setHoveredIndex(index)
  }

  function scheduleUnhoverDay() {
    clearTimeout(clearHoverTimeout.current)
    clearHoverTimeout.current = setTimeout(() => setHoveredIndex(null), 100)
  }

  // Keeps keyboard focus following the selected day (e.g. after it's set
  // from outside, such as clicking a different heatmap) without an effect:
  // an extra render that adjusts state from a prop change, computed during
  // render itself rather than after a commit, per React's guidance on
  // adjusting state when a prop changes.
  const [prevSelectedIndex, setPrevSelectedIndex] = useState(selectedIndex)
  if (selectedIndex !== prevSelectedIndex) {
    setPrevSelectedIndex(selectedIndex)
    if (selectedIndex >= 0) {
      setFocusedIndex(selectedIndex)
    }
  }

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

  function selectIndex(index: number) {
    const clamped = Math.max(0, Math.min(activity.length - 1, index))
    setFocusedIndex(clamped)
    const [y, m, d] = parseDateKey(activity[clamped].key)
    onSelectDay(y, m, d)
  }

  function handleKeyDown(event: React.KeyboardEvent<SVGSVGElement>) {
    switch (event.key) {
      case 'ArrowRight':
        event.preventDefault()
        setFocusedIndex((index) => Math.min(activity.length - 1, index + 7))
        return
      case 'ArrowLeft':
        event.preventDefault()
        setFocusedIndex((index) => Math.max(0, index - 7))
        return
      case 'ArrowDown':
        event.preventDefault()
        setFocusedIndex((index) => Math.min(activity.length - 1, index + 1))
        return
      case 'ArrowUp':
        event.preventDefault()
        setFocusedIndex((index) => Math.max(0, index - 1))
        return
      case 'Home':
        event.preventDefault()
        setFocusedIndex(0)
        return
      case 'End':
        event.preventDefault()
        setFocusedIndex(activity.length - 1)
        return
      case 'Enter':
      case ' ':
        event.preventDefault()
        selectIndex(focusedIndex)
        return
      default:
        return
    }
  }

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4">
      <div className="flex items-baseline justify-between gap-3">
        <div>
          <h3 className="font-heading text-sm font-semibold">Activity</h3>
          <p className="text-[11.5px] font-medium text-text-faint">
            Daily spend, {currency} · darker means more spent that day
          </p>
        </div>
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
      <div className="relative">
        <div className="overflow-x-auto">
          <svg
            viewBox={`0 0 ${width} ${height}`}
            width={width}
            height={height}
            role="grid"
            tabIndex={0}
            aria-label={`Calendar heatmap of daily spending in ${year}, shaded by amount spent that day. Use the arrow keys to move between days and Enter to filter the transaction list to one.`}
            aria-activedescendant={`heatmap-day-${focusedIndex}`}
            onKeyDown={handleKeyDown}
            onFocus={() => setHasFocus(true)}
            onBlur={() => setHasFocus(false)}
            className="outline-none"
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
              const isSelected = index === selectedIndex
              const isFocused = hasFocus && index === focusedIndex
              const label = `${day.key}: ${day.spendMinor > 0 ? formatMoney(day.spendMinor, currency) : 'No spend'}`
              return (
                <rect
                  key={day.key}
                  id={`heatmap-day-${index}`}
                  role="gridcell"
                  aria-selected={isSelected}
                  aria-label={label}
                  x={PAD_LEFT + column * STEP}
                  y={PAD_TOP + row * STEP}
                  width={CELL}
                  height={CELL}
                  rx={3}
                  fill={day.level === 0 ? 'var(--color-border)' : 'var(--color-primary)'}
                  fillOpacity={LEVEL_OPACITY[day.level]}
                  stroke={
                    isSelected
                      ? 'var(--color-foreground)'
                      : isFocused
                        ? 'var(--color-primary)'
                        : 'none'
                  }
                  strokeWidth={isSelected ? 2 : isFocused ? 1.5 : 0}
                  strokeDasharray={isFocused && !isSelected ? '1.5,1.5' : undefined}
                  className="cursor-pointer"
                  onClick={() => selectIndex(index)}
                  onMouseEnter={() => hoverDay(index)}
                  onMouseLeave={scheduleUnhoverDay}
                />
              )
            })}
          </svg>
        </div>
        {hoveredIndex !== null && (
          <HeatmapTooltip
            day={activity[hoveredIndex]}
            currency={currency}
            x={PAD_LEFT + Math.floor((hoveredIndex + jan1Weekday) / 7) * STEP + CELL / 2}
            y={PAD_TOP + ((hoveredIndex + jan1Weekday) % 7) * STEP}
          />
        )}
      </div>
    </div>
  )
}

/** A custom tooltip matching the design reference's `.chart-tooltip` styling
 * (the same box the spend chart's tooltip uses), replacing the native
 * browser tooltip an SVG `<title>` would otherwise give. */
function HeatmapTooltip({
  day,
  currency,
  x,
  y,
}: {
  day: DayActivity
  currency: string
  x: number
  y: number
}) {
  return (
    <div
      className="pointer-events-none absolute z-50 -translate-x-1/2 -translate-y-full rounded-[10px] border border-border bg-secondary px-3 py-2.5 whitespace-nowrap shadow-lg transition-[left,top] duration-150 ease-out"
      style={{ left: x, top: y - 10 }}
    >
      <div className="text-[10.5px] font-semibold tracking-[0.06em] text-text-faint uppercase">
        {formatUtcDate(`${day.key}T00:00:00.000Z`)}
      </div>
      <div className="mt-1.5 text-xs font-medium tabular-nums text-foreground">
        {day.spendMinor > 0 ? `${formatMoney(day.spendMinor, currency)} spent` : 'No spend'}
      </div>
    </div>
  )
}

export default ActivityHeatmap
