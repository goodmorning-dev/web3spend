import { ChevronDown } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Cell, Pie, PieChart } from 'recharts'
import type { CategoryBucket } from '@/analyzers'
import { ChartContainer, type ChartConfig } from '@/components/ui/chart'
import { cn } from '@/lib/utils'
import { formatMoney, formatPercent } from '@/utils/format'

interface CategoryBreakdownProps {
  buckets: CategoryBucket[]
  currency: string
  /** Called with a category's key (CategoryBucket.key) when its row or
   * slice is clicked, to open its transactions. */
  onSelectCategory?: (key: string) => void
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

/** The donut only ever shows a handful of slices legibly; beyond
 * `MAX_VISIBLE_CATEGORIES`, the remainder rolls up into a synthetic "Other"
 * bucket. This is a presentation-only grouping, not a real category
 * taxonomy (MVP-PLAN §5 still shows ether.fi's raw category text as-is
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

/** What the pointer (or keyboard focus) is on: a row in the list, or a
 * slice of the donut. Kept apart because, with the list expanded, a row and
 * a slice aren't one-to-one: every category past the top five lives inside
 * the single "Other" slice. */
type HoverTarget = { kind: 'row'; index: number } | { kind: 'slice'; index: number }

/**
 * MVP-PLAN §5: sorted spend by category, from cleared purchases only. The
 * donut and the list show the top five and roll the rest into "Other";
 * "View all" (or clicking "Other") expands the list to every category, so
 * what's inside "Other" is one click away. Each real category's row and
 * slice open its transactions.
 */
function CategoryBreakdown({ buckets, currency, onSelectCategory }: CategoryBreakdownProps) {
  const [hover, setHover] = useState<HoverTarget | null>(null)
  const [expanded, setExpanded] = useState(false)
  const clearHoverTimeout = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  useEffect(() => () => clearTimeout(clearHoverTimeout.current), [])

  // A filter change (period, card, currency) gives `buckets` a new
  // reference with a different shape; a hover target left over from the
  // previous shape can point past the end of the new lists (or, even if
  // still in range, highlight a different category than the one the
  // pointer is actually over). Reset it during render on the same
  // prop-change-adjusts-state pattern ActivityHeatmap uses for its selected
  // index, rather than an effect that would let one bad render through.
  const [prevBuckets, setPrevBuckets] = useState(buckets)
  if (buckets !== prevBuckets) {
    setPrevBuckets(buckets)
    setHover(null)
  }

  // Moving the mouse from one slice/row to the next (across the small gap
  // paddingAngle leaves between slices, or the gap between list rows) fires
  // a mouseleave right before the next mouseenter; clearing the hover
  // immediately snapped the donut back to "Total spent" for a single frame
  // in between, reading as a flicker. Deferring the clear briefly, and
  // cancelling it if a new hover arrives in that window, keeps the
  // transition smooth instead.
  function hoverTarget(target: HoverTarget) {
    clearTimeout(clearHoverTimeout.current)
    setHover(target)
  }

  function scheduleUnhover() {
    clearTimeout(clearHoverTimeout.current)
    clearHoverTimeout.current = setTimeout(() => setHover(null), 100)
  }

  if (buckets.length === 0) {
    return (
      <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4">
        <h3 className="font-heading text-sm font-semibold">Spending by category</h3>
        <p className="flex flex-1 items-center text-sm text-text-faint">
          No cleared purchases in this period yet.
        </p>
      </div>
    )
  }

  const totalSpendMinor = buckets.reduce((sum, bucket) => sum + bucket.spendMinor, 0)
  const slices = rollupTopCategories(buckets)
  const hasOther = buckets.length > MAX_VISIBLE_CATEGORIES
  const otherSliceIndex = slices.length - 1
  const isExpanded = expanded && hasOther
  const rows = isExpanded ? buckets : slices

  /** The slice a row belongs to: itself while collapsed; once expanded,
   * every category past the top five belongs to "Other". */
  function sliceForRow(rowIndex: number): number {
    return isExpanded && rowIndex >= MAX_VISIBLE_CATEGORIES ? otherSliceIndex : rowIndex
  }

  function isRowHighlighted(rowIndex: number): boolean {
    if (hover === null) {
      return false
    }
    // hovering the "Other" slice with the list expanded lights up every
    // category inside it
    return hover.kind === 'row' ? hover.index === rowIndex : sliceForRow(rowIndex) === hover.index
  }

  function isSliceDimmed(sliceIndex: number): boolean {
    if (hover === null) {
      return false
    }
    const hoveredSlice = hover.kind === 'slice' ? hover.index : sliceForRow(hover.index)
    return hoveredSlice !== sliceIndex
  }

  const centerAmount =
    hover === null
      ? totalSpendMinor
      : hover.kind === 'row'
        ? (rows[hover.index]?.spendMinor ?? totalSpendMinor)
        : (slices[hover.index]?.spendMinor ?? totalSpendMinor)

  function rowColor(rowIndex: number): string {
    return colorForVisibleIndex(sliceForRow(rowIndex), slices.length, hasOther)
  }

  /** Clicking "Other" expands the list rather than opening transactions,
   * since there's no single category behind it. */
  function isOtherSlice(sliceIndex: number): boolean {
    return hasOther && sliceIndex === otherSliceIndex
  }

  function openRow(rowIndex: number) {
    const bucket = rows[rowIndex]
    if (!isExpanded && isOtherSlice(rowIndex)) {
      setExpanded(true)
    } else if (bucket?.key !== undefined) {
      onSelectCategory?.(bucket.key)
    }
  }

  function openSlice(sliceIndex: number) {
    if (isOtherSlice(sliceIndex)) {
      setExpanded(true)
    } else {
      const key = slices[sliceIndex]?.key
      if (key !== undefined) {
        onSelectCategory?.(key)
      }
    }
  }

  function isRowClickable(rowIndex: number): boolean {
    if (!isExpanded && isOtherSlice(rowIndex)) {
      return true
    }
    return onSelectCategory !== undefined && rows[rowIndex]?.key !== undefined
  }

  function isSliceClickable(sliceIndex: number): boolean {
    return (
      isOtherSlice(sliceIndex) ||
      (onSelectCategory !== undefined && slices[sliceIndex]?.key !== undefined)
    )
  }

  // ether.fi's raw category text is untrusted and shown as-is (MVP-PLAN §5);
  // it must never become a ChartConfig key, since shadcn's ChartContainer
  // interpolates those keys unescaped into a <style> tag (see chart.tsx's
  // ChartStyle). A synthetic, index-based key keeps the config safe while
  // `label` still carries the real category text as plain, auto-escaped
  // React content.
  const chartConfig = Object.fromEntries(
    slices.map((bucket, index) => [
      `category-${index}`,
      {
        label: bucket.category,
        color: colorForVisibleIndex(index, slices.length, hasOther),
      },
    ]),
  ) satisfies ChartConfig

  const data = slices.map((bucket, index) => ({
    categoryKey: `category-${index}`,
    spendMinor: bucket.spendMinor / 100,
    fill: colorForVisibleIndex(index, slices.length, hasOther),
  }))

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-heading text-sm font-semibold">Spending by category</h3>
        {hasOther && (
          <button
            type="button"
            onClick={() => setExpanded((value) => !value)}
            aria-expanded={isExpanded}
            className="inline-flex shrink-0 cursor-pointer items-center gap-1 text-xs font-semibold text-primary hover:underline"
          >
            {isExpanded ? 'Show less' : 'View all'}
            <ChevronDown
              className={cn('size-3.5 transition-transform', isExpanded && 'rotate-180')}
            />
          </button>
        )}
      </div>
      <div className="flex flex-1 flex-col items-center justify-center gap-4 sm:flex-row sm:items-start">
        <div className="relative shrink-0 sm:self-center">
          <ChartContainer
            config={chartConfig}
            className="mx-auto aspect-square h-[190px] w-[190px]"
          >
            <PieChart>
              <Pie
                data={data}
                dataKey="spendMinor"
                nameKey="categoryKey"
                innerRadius={60}
                outerRadius={90}
                paddingAngle={2.5}
                strokeWidth={2}
                isAnimationActive={false}
                onMouseEnter={(_, index) => hoverTarget({ kind: 'slice', index })}
                onMouseLeave={scheduleUnhover}
                onClick={(_, index) => openSlice(index)}
              >
                {data.map((entry, index) => (
                  <Cell
                    key={entry.categoryKey}
                    fill={entry.fill}
                    className={cn(
                      'transition-[fill-opacity] duration-200 ease-out',
                      isSliceClickable(index) && 'cursor-pointer',
                    )}
                    fillOpacity={isSliceDimmed(index) ? 0.32 : 1}
                  />
                ))}
              </Pie>
            </PieChart>
          </ChartContainer>
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-6 text-center">
            <span className="text-xl font-semibold tabular-nums">
              {formatMoney(centerAmount, currency)}
            </span>
            <span className="text-[11.5px] font-medium text-text-faint">Total spent</span>
          </div>
        </div>
        <ul
          className={cn(
            'flex w-full min-w-0 flex-col gap-2',
            // a long expanded list scrolls inside the card on wider screens
            // instead of stretching it (and the chart beside it) down the page
            isExpanded && 'sm:max-h-80 sm:overflow-y-auto sm:pr-1',
          )}
        >
          {rows.map((bucket, index) => {
            const rowContent = (
              <>
                <span
                  className="size-2.5 shrink-0 rounded-[2px]"
                  style={{ backgroundColor: rowColor(index) }}
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
              </>
            )
            const rowClass = cn(
              '-mx-1.5 flex w-[calc(100%+0.75rem)] items-center gap-2 rounded-lg px-1.5 py-1 text-left text-sm transition-colors duration-200',
              isRowHighlighted(index) && 'bg-muted',
            )
            return (
              <li
                key={bucket.key ?? bucket.category}
                onMouseEnter={() => hoverTarget({ kind: 'row', index })}
                onMouseLeave={scheduleUnhover}
              >
                {isRowClickable(index) ? (
                  <button
                    type="button"
                    onClick={() => openRow(index)}
                    onFocus={() => hoverTarget({ kind: 'row', index })}
                    onBlur={scheduleUnhover}
                    className={cn(
                      rowClass,
                      'cursor-pointer focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
                    )}
                  >
                    {rowContent}
                  </button>
                ) : (
                  <div className={rowClass}>{rowContent}</div>
                )}
              </li>
            )
          })}
        </ul>
      </div>
    </div>
  )
}

export default CategoryBreakdown
