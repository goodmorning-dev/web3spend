import { ChevronRight } from 'lucide-react'
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
  onViewAll: () => void
}

// Reserved for a real category so it's never reused for "Other" too: with
// a 5-color palette and up to 5 real categories + 1 "Other" slice (6 total),
// naively cycling `index % 5` would give the 6th slice (Other, last) the
// same color as the 1st, and a pie's last and first slices sit next to each
// other. "Other" always gets OTHER_COLOR instead; real categories cycle
// through the remaining 4 colors when Other is present, or all 5 when it
// isn't (in which case 5 slices exactly fill the palette with no repeats).
const REAL_CATEGORY_PALETTE = [
  'var(--color-chart-1)',
  'var(--color-chart-2)',
  'var(--color-chart-3)',
  'var(--color-chart-4)',
]
const FULL_PALETTE = [...REAL_CATEGORY_PALETTE, 'var(--color-chart-5)']
const OTHER_COLOR = 'var(--color-chart-5)'

const MAX_VISIBLE_CATEGORIES = 5

function colorForVisibleIndex(index: number, total: number, hasOther: boolean): string {
  if (hasOther && index === total - 1) {
    return OTHER_COLOR
  }
  const palette = hasOther ? REAL_CATEGORY_PALETTE : FULL_PALETTE
  return palette[index % palette.length]
}

/** The donut and list only ever show a handful of slices legibly; beyond
 * `MAX_VISIBLE_CATEGORIES`, the remainder rolls up into a synthetic "Other"
 * bucket. This is a presentation-only grouping, not a real category
 * taxonomy (MVP-PLAN §5 still shows Etherfi's raw category text as-is
 * everywhere else, e.g. the transaction table). */
function rollupTopCategories(buckets: CategoryBucket[]): CategoryBucket[] {
  if (buckets.length <= MAX_VISIBLE_CATEGORIES) {
    return buckets
  }
  const visible = buckets.slice(0, MAX_VISIBLE_CATEGORIES)
  const rest = buckets.slice(MAX_VISIBLE_CATEGORIES)
  return [
    ...visible,
    {
      category: 'Other',
      spendMinor: rest.reduce((sum, bucket) => sum + bucket.spendMinor, 0),
      share: rest.reduce((sum, bucket) => sum + bucket.share, 0),
    },
  ]
}

function ViewAllButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex shrink-0 cursor-pointer items-center gap-1 text-xs font-semibold text-primary hover:underline"
    >
      View all
      <ChevronRight className="size-3.5" />
    </button>
  )
}

/** MVP-PLAN §5: sorted spend by category, from cleared purchases only. */
function CategoryBreakdown({ buckets, currency, onViewAll }: CategoryBreakdownProps) {
  if (buckets.length === 0) {
    return (
      <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4">
        <div className="flex items-center justify-between gap-3">
          <h3 className="font-heading text-sm font-semibold">Spending by category</h3>
          <ViewAllButton onClick={onViewAll} />
        </div>
        <p className="text-sm text-text-faint">No cleared purchases in this period yet.</p>
      </div>
    )
  }

  const totalSpendMinor = buckets.reduce((sum, bucket) => sum + bucket.spendMinor, 0)
  const visibleBuckets = rollupTopCategories(buckets)
  const hasOther = buckets.length > MAX_VISIBLE_CATEGORIES

  // Etherfi's raw category text is untrusted and shown as-is (MVP-PLAN §5);
  // it must never become a ChartConfig key, since shadcn's ChartContainer
  // interpolates those keys unescaped into a <style> tag (see chart.tsx's
  // ChartStyle). A synthetic, index-based key keeps the config safe while
  // `label` still carries the real category text as plain, auto-escaped
  // React content.
  const chartConfig = Object.fromEntries(
    visibleBuckets.map((bucket, index) => [
      `category-${index}`,
      {
        label: bucket.category,
        color: colorForVisibleIndex(index, visibleBuckets.length, hasOther),
      },
    ]),
  ) satisfies ChartConfig

  const data = visibleBuckets.map((bucket, index) => ({
    categoryKey: `category-${index}`,
    spendMinor: bucket.spendMinor / 100,
    fill: colorForVisibleIndex(index, visibleBuckets.length, hasOther),
  }))

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-heading text-sm font-semibold">Spending by category</h3>
        <ViewAllButton onClick={onViewAll} />
      </div>
      <div className="flex flex-col items-center gap-4 sm:flex-row">
        <div className="relative shrink-0">
          <ChartContainer
            config={chartConfig}
            className="mx-auto aspect-square h-[190px] w-[190px]"
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
                innerRadius={60}
                outerRadius={90}
                paddingAngle={2.5}
                strokeWidth={2}
                isAnimationActive={false}
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
          {visibleBuckets.map((bucket, index) => (
            <li key={bucket.category} className="flex items-center gap-2 text-sm">
              <span
                className="size-2.5 shrink-0 rounded-[2px]"
                style={{
                  backgroundColor: colorForVisibleIndex(index, visibleBuckets.length, hasOther),
                }}
                aria-hidden="true"
              />
              <span className="min-w-0 flex-1 truncate text-text-dim" title={bucket.category}>
                {bucket.category}
              </span>
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
