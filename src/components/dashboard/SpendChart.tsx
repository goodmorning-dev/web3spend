import { useState, type ReactNode } from 'react'
import { Area, CartesianGrid, ComposedChart, Line, Tooltip, XAxis, YAxis } from 'recharts'
import type { SpendTrendPoint } from '@/analyzers'
import { ChartContainer, type ChartConfig } from '@/components/ui/chart'
import { cn } from '@/lib/utils'
import { formatCompactMoney, formatMoney } from '@/utils/format'

interface SpendChartProps {
  trend: SpendTrendPoint[]
  currency: string
}

type SeriesKey = 'thisMonthMinor' | 'lastMonthMinor' | 'averageMonthlyMinor'

// Deliberately not the per-chart `--color-<dataKey>` variables ChartStyle
// generates: those only exist inside `[data-chart=...]`, which the legend
// above the chart itself sits outside of. These theme tokens are global.
const SERIES_COLOR: Record<SeriesKey, string> = {
  thisMonthMinor: 'var(--color-chart-1)',
  lastMonthMinor: 'var(--color-chart-5)',
  averageMonthlyMinor: 'var(--color-chart-2)',
}

const SERIES_ORDER: Array<{
  key: SeriesKey
  label: string
  tooltipLabel: string
  dashed: boolean
}> = [
  {
    key: 'thisMonthMinor',
    label: 'This month (to date)',
    tooltipLabel: 'This month',
    dashed: false,
  },
  { key: 'lastMonthMinor', label: 'Last month', tooltipLabel: 'Last month', dashed: false },
  {
    key: 'averageMonthlyMinor',
    label: 'Average monthly',
    tooltipLabel: 'Average',
    dashed: true,
  },
]

const chartConfig = {
  thisMonthMinor: { label: 'This month (to date)' },
  lastMonthMinor: { label: 'Last month' },
  averageMonthlyMinor: { label: 'Average monthly' },
} satisfies ChartConfig

function toMajorUnits(amountMinor: number | null): number | null {
  return amountMinor === null ? null : amountMinor / 100
}

interface TooltipPayloadItem {
  dataKey?: unknown
  value?: unknown
}

interface SpendChartTooltipProps {
  active?: boolean
  payload?: readonly TooltipPayloadItem[]
  label?: ReactNode
  currency: string
  hiddenKeys: Set<SeriesKey>
}

/** A custom tooltip matching the design reference's own `.tt-day`/`.tt-row`
 * markup exactly, since shadcn's generic ChartTooltipContent doesn't give
 * this row layout (fixed-width label column, right-aligned tabular value)
 * without fighting its more generic defaults. */
export function SpendChartTooltip({
  active,
  payload,
  label,
  currency,
  hiddenKeys,
}: SpendChartTooltipProps) {
  if (!active || !payload?.length) {
    return null
  }

  const rows = SERIES_ORDER.filter((series) => !hiddenKeys.has(series.key))
    .map((series) => ({
      series,
      value: payload.find((item: TooltipPayloadItem) => item.dataKey === series.key)?.value,
    }))
    .filter((row): row is { series: (typeof SERIES_ORDER)[number]; value: number } => {
      return typeof row.value === 'number'
    })

  if (rows.length === 0) {
    return null
  }

  return (
    <div className="rounded-[10px] border border-border bg-secondary px-3 py-2.5 whitespace-nowrap shadow-lg">
      <div className="mb-1.5 text-[10.5px] font-semibold tracking-[0.06em] text-text-faint uppercase">
        Day {label}
      </div>
      <div className="flex flex-col gap-1.5">
        {rows.map(({ series, value }) => (
          <div key={series.key} className="flex items-center gap-2 text-xs font-medium">
            <span
              className="size-[7px] shrink-0 rounded-[2px]"
              style={{ backgroundColor: SERIES_COLOR[series.key] }}
            />
            <span className="min-w-[78px] text-text-dim">{series.tooltipLabel}</span>
            <span className="tabular-nums text-foreground">
              {formatMoney(Math.round(value * 100), currency)}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

/**
 * The Sept 2026 design pass: cumulative spend this month against last month
 * and the average month, so a viewer can see at a glance whether this
 * month is running ahead of or behind normal, with a shared hover tooltip
 * comparing all three at a given day. The legend toggles a series on/off,
 * matching the design reference.
 */
function SpendChart({ trend, currency }: SpendChartProps) {
  const [hiddenKeys, setHiddenKeys] = useState<Set<SeriesKey>>(new Set())

  const data = trend.map((point) => ({
    day: point.day,
    thisMonthMinor: toMajorUnits(point.thisMonthMinor),
    lastMonthMinor: point.lastMonthMinor / 100,
    averageMonthlyMinor: point.averageMonthlyMinor / 100,
  }))

  function toggleSeries(key: SeriesKey) {
    setHiddenKeys((prev) => {
      const next = new Set(prev)
      if (next.has(key)) {
        next.delete(key)
      } else {
        next.add(key)
      }
      return next
    })
  }

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4">
      <div className="flex flex-col gap-2.5">
        <div className="flex items-baseline justify-between gap-3">
          <h3 className="font-heading text-sm font-semibold">Spending this month</h3>
          <span className="text-[11.5px] font-medium whitespace-nowrap text-text-faint">
            Hover to compare
          </span>
        </div>
        <div className="flex flex-wrap gap-3.5">
          {SERIES_ORDER.map((series) => {
            const isOff = hiddenKeys.has(series.key)
            return (
              <button
                key={series.key}
                type="button"
                onClick={() => toggleSeries(series.key)}
                aria-pressed={!isOff}
                className={cn(
                  'inline-flex cursor-pointer items-center gap-1.5 text-[12px] font-medium transition-opacity',
                  isOff && 'opacity-35',
                )}
                style={{ color: SERIES_COLOR[series.key] }}
              >
                <span
                  className={
                    series.dashed
                      ? 'size-2 rounded-[2px] border-[1.6px] border-dashed border-current'
                      : 'size-2 rounded-[2px] bg-current'
                  }
                />
                {series.label}
              </button>
            )
          })}
        </div>
      </div>
      <ChartContainer config={chartConfig} className="aspect-auto h-56 w-full">
        <ComposedChart data={data} margin={{ left: 0, right: 8, top: 4, bottom: 0 }}>
          <defs>
            <linearGradient id="spend-trend-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={SERIES_COLOR.thisMonthMinor} stopOpacity={0.32} />
              <stop offset="100%" stopColor={SERIES_COLOR.thisMonthMinor} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} strokeDasharray="3 3" />
          <XAxis dataKey="day" tickLine={false} axisLine={false} tickMargin={8} minTickGap={24} />
          <YAxis
            tickLine={false}
            axisLine={false}
            width={44}
            tickFormatter={(value: number) => formatCompactMoney(value, currency)}
          />
          <Tooltip
            cursor={{ stroke: 'var(--color-border)', strokeDasharray: '3 3' }}
            content={({ active, payload, label }) => (
              <SpendChartTooltip
                active={active}
                payload={payload}
                label={label}
                currency={currency}
                hiddenKeys={hiddenKeys}
              />
            )}
          />
          <Line
            dataKey="lastMonthMinor"
            stroke={SERIES_COLOR.lastMonthMinor}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 3.5 }}
            hide={hiddenKeys.has('lastMonthMinor')}
          />
          <Line
            dataKey="averageMonthlyMinor"
            stroke={SERIES_COLOR.averageMonthlyMinor}
            strokeWidth={2}
            strokeDasharray="5 5"
            dot={false}
            activeDot={{ r: 3.5 }}
            hide={hiddenKeys.has('averageMonthlyMinor')}
          />
          <Area
            dataKey="thisMonthMinor"
            stroke={SERIES_COLOR.thisMonthMinor}
            strokeWidth={2.6}
            fill="url(#spend-trend-fill)"
            connectNulls={false}
            dot={false}
            activeDot={{ r: 4 }}
            hide={hiddenKeys.has('thisMonthMinor')}
          />
        </ComposedChart>
      </ChartContainer>
    </div>
  )
}

export default SpendChart
