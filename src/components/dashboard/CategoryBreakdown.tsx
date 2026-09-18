import { Cell, Pie, PieChart } from 'recharts'
import type { CategoryBucket } from '@/analyzers'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart'
import { formatMoney, formatPercent } from '@/utils/format'

interface CategoryBreakdownProps {
  buckets: CategoryBucket[]
  currency: string
}

const PALETTE = [
  'var(--color-chart-1)',
  'var(--color-chart-2)',
  'var(--color-chart-3)',
  'var(--color-chart-4)',
  'var(--color-chart-5)',
]

function colorForIndex(index: number): string {
  return PALETTE[index % PALETTE.length]
}

/** MVP-PLAN §5: sorted spend by category, from cleared purchases only. */
function CategoryBreakdown({ buckets, currency }: CategoryBreakdownProps) {
  if (buckets.length === 0) {
    return (
      <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4">
        <h3 className="font-heading text-sm font-semibold">Spending by category</h3>
        <p className="text-sm text-text-faint">No cleared purchases in this period yet.</p>
      </div>
    )
  }

  const totalSpendMinor = buckets.reduce((sum, bucket) => sum + bucket.spendMinor, 0)

  // Etherfi's raw category text is untrusted and shown as-is (MVP-PLAN §5);
  // it must never become a ChartConfig key, since shadcn's ChartContainer
  // interpolates those keys unescaped into a <style> tag (see chart.tsx's
  // ChartStyle). A synthetic, index-based key keeps the config safe while
  // `label` still carries the real category text as plain, auto-escaped
  // React content.
  const chartConfig = Object.fromEntries(
    buckets.map((bucket, index) => [
      `category-${index}`,
      { label: bucket.category, color: colorForIndex(index) },
    ]),
  ) satisfies ChartConfig

  const data = buckets.map((bucket, index) => ({
    categoryKey: `category-${index}`,
    spendMinor: bucket.spendMinor / 100,
    fill: colorForIndex(index),
  }))

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4">
      <h3 className="font-heading text-sm font-semibold">Spending by category</h3>
      <div className="flex flex-col items-center gap-4 sm:flex-row">
        <div className="relative shrink-0">
          <ChartContainer
            config={chartConfig}
            className="mx-auto aspect-square h-[172px] w-[172px]"
          >
            <PieChart>
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    formatter={(value) => formatMoney(Math.round(Number(value) * 100), currency)}
                  />
                }
              />
              <Pie
                data={data}
                dataKey="spendMinor"
                nameKey="categoryKey"
                innerRadius={56}
                outerRadius={78}
                strokeWidth={2}
              >
                {data.map((entry) => (
                  <Cell key={entry.categoryKey} fill={entry.fill} />
                ))}
              </Pie>
            </PieChart>
          </ChartContainer>
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-xl font-semibold tabular-nums">
              {formatMoney(totalSpendMinor, currency)}
            </span>
            <span className="text-[11.5px] font-medium text-text-faint">Total spent</span>
          </div>
        </div>
        <ul className="flex w-full min-w-0 flex-col gap-2">
          {buckets.map((bucket, index) => (
            <li key={bucket.category} className="flex items-center gap-2 text-sm">
              <span
                className="size-2.5 shrink-0 rounded-[2px]"
                style={{ backgroundColor: colorForIndex(index) }}
                aria-hidden="true"
              />
              <span className="min-w-0 flex-1 truncate text-text-dim">{bucket.category}</span>
              <span className="shrink-0 font-medium tabular-nums">
                {formatMoney(bucket.spendMinor, currency)}
              </span>
              <span className="w-12 shrink-0 text-right tabular-nums text-text-faint">
                {formatPercent(bucket.share * 100, 0)}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

export default CategoryBreakdown
