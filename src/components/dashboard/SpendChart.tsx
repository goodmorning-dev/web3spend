import { Area, CartesianGrid, ComposedChart, Line, XAxis, YAxis } from 'recharts'
import type { SpendTrendPoint } from '@/analyzers'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart'
import { formatCompactMoney, formatMoney } from '@/utils/format'

interface SpendChartProps {
  trend: SpendTrendPoint[]
  currency: string
}

const chartConfig = {
  thisMonthMinor: { label: 'This month (to date)', color: 'var(--color-chart-1)' },
  lastMonthMinor: { label: 'Last month', color: 'var(--color-chart-5)' },
  averageMonthlyMinor: { label: 'Average monthly', color: 'var(--color-chart-2)' },
} satisfies ChartConfig

const LEGEND_ITEMS = [
  { key: 'thisMonthMinor', label: 'This month (to date)', dashed: false },
  { key: 'lastMonthMinor', label: 'Last month', dashed: false },
  { key: 'averageMonthlyMinor', label: 'Average monthly', dashed: true },
] as const

function toMajorUnits(amountMinor: number | null): number | null {
  return amountMinor === null ? null : amountMinor / 100
}

/**
 * The Sept 2026 design pass: cumulative spend this month against last month
 * and the average month, so a viewer can see at a glance whether this
 * month is running ahead of or behind normal, with a shared hover tooltip
 * comparing all three at a given day.
 */
function SpendChart({ trend, currency }: SpendChartProps) {
  const data = trend.map((point) => ({
    day: point.day,
    thisMonthMinor: toMajorUnits(point.thisMonthMinor),
    lastMonthMinor: point.lastMonthMinor / 100,
    averageMonthlyMinor: point.averageMonthlyMinor / 100,
  }))

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
          {LEGEND_ITEMS.map((item) => (
            <span
              key={item.key}
              className="inline-flex items-center gap-1.5 text-[12px] font-medium"
              style={{ color: `var(--color-${item.key})` }}
            >
              <span
                className={
                  item.dashed
                    ? 'size-2 rounded-[2px] border-[1.6px] border-dashed border-current'
                    : 'size-2 rounded-[2px] bg-current'
                }
              />
              {item.label}
            </span>
          ))}
        </div>
      </div>
      <ChartContainer config={chartConfig} className="aspect-auto h-56 w-full">
        <ComposedChart data={data} margin={{ left: 0, right: 8, top: 4, bottom: 0 }}>
          <defs>
            <linearGradient id="spend-trend-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--color-thisMonthMinor)" stopOpacity={0.32} />
              <stop offset="100%" stopColor="var(--color-thisMonthMinor)" stopOpacity={0} />
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
          <ChartTooltip
            content={
              <ChartTooltipContent
                labelFormatter={(day) => `Day ${day}`}
                formatter={(value) => formatMoney(Math.round(Number(value) * 100), currency)}
              />
            }
          />
          <Line
            dataKey="lastMonthMinor"
            stroke="var(--color-lastMonthMinor)"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 3.5 }}
          />
          <Line
            dataKey="averageMonthlyMinor"
            stroke="var(--color-averageMonthlyMinor)"
            strokeWidth={2}
            strokeDasharray="5 5"
            dot={false}
            activeDot={{ r: 3.5 }}
          />
          <Area
            dataKey="thisMonthMinor"
            stroke="var(--color-thisMonthMinor)"
            strokeWidth={2.6}
            fill="url(#spend-trend-fill)"
            connectNulls={false}
            dot={false}
            activeDot={{ r: 4 }}
          />
        </ComposedChart>
      </ChartContainer>
    </div>
  )
}

export default SpendChart
