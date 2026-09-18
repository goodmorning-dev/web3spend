import { Bar, BarChart, CartesianGrid, XAxis } from 'recharts'
import type { PeriodBucket } from '@/analyzers'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart'
import { formatMoney } from '@/utils/format'

interface SpendChartProps {
  buckets: PeriodBucket[]
  currency: string
}

const chartConfig = {
  spendMinor: {
    label: 'Spent',
    color: 'var(--color-chart-1)',
  },
} satisfies ChartConfig

/** `PeriodBucket.key` for a day bucket is "YYYY-MM-DD" (see periodBuckets.ts). */
function dayOfMonth(bucketKey: string): number {
  return Number(bucketKey.split('-')[2])
}

/** MVP-PLAN §5: total spend per day within the selected month. */
function SpendChart({ buckets, currency }: SpendChartProps) {
  const data = buckets.map((bucket) => ({
    day: dayOfMonth(bucket.key),
    spendMinor: bucket.spendMinor / 100,
  }))

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="font-heading text-sm font-semibold">Daily spend</h3>
        <span className="text-[11.5px] font-medium text-text-faint">This period</span>
      </div>
      <ChartContainer config={chartConfig} className="aspect-auto h-56 w-full">
        <BarChart data={data} margin={{ left: 0, right: 0, top: 4, bottom: 0 }}>
          <CartesianGrid vertical={false} strokeDasharray="3 3" />
          <XAxis dataKey="day" tickLine={false} axisLine={false} tickMargin={8} minTickGap={16} />
          <ChartTooltip
            content={
              <ChartTooltipContent
                labelFormatter={(day) => `Day ${day}`}
                formatter={(value) => formatMoney(Math.round(Number(value) * 100), currency)}
              />
            }
          />
          <Bar dataKey="spendMinor" fill="var(--color-spendMinor)" radius={4} />
        </BarChart>
      </ChartContainer>
    </div>
  )
}

export default SpendChart
