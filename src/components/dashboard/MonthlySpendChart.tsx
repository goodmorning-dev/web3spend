import { Bar, BarChart, CartesianGrid, ReferenceLine, Tooltip, XAxis, YAxis } from 'recharts'
import type { PeriodBucket } from '@/analyzers'
import { ChartContainer, type ChartConfig } from '@/components/ui/chart'
import { formatUtcMonthLabel } from '@/utils/dates'
import { formatCompactMoney, formatMoney } from '@/utils/format'

interface MonthlySpendChartProps {
  /** One per month, oldest first (see bucketByMonthRange). */
  buckets: PeriodBucket[]
  currency: string
  /** What the period is called in the header, e.g. "2026" or "All time". */
  periodLabel: string
}

const SPEND_COLOR = 'var(--color-chart-1)'
const AVERAGE_COLOR = 'var(--color-chart-2)'

const chartConfig = {
  spend: { label: 'Spent' },
} satisfies ChartConfig

interface ChartDatum {
  key: string
  axisLabel: string
  spend: number
  bucket: PeriodBucket
}

function parseMonthKey(key: string): [number, number] {
  const [year, month] = key.split('-').map(Number)
  return [year, month]
}

/** "Sep", or "Sep 25" when the months shown span more than one year. */
function axisLabel(key: string, showYear: boolean): string {
  const [year, month] = parseMonthKey(key)
  return new Date(Date.UTC(year, month - 1, 1)).toLocaleDateString(undefined, {
    month: 'short',
    year: showYear ? '2-digit' : undefined,
    timeZone: 'UTC',
  })
}

function MonthlyTooltip({
  active,
  payload,
  currency,
}: {
  active?: boolean
  payload?: readonly { payload?: unknown }[]
  currency: string
}) {
  const datum = payload?.[0]?.payload as ChartDatum | undefined
  if (!active || !datum) {
    return null
  }
  const [year, month] = parseMonthKey(datum.key)
  const { spendMinor, cashbackMinor, effectiveCashbackPct } = datum.bucket

  return (
    <div className="rounded-[10px] border border-border bg-secondary px-3 py-2.5 whitespace-nowrap shadow-lg">
      <div className="mb-1.5 text-[10.5px] font-semibold tracking-[0.06em] text-text-faint uppercase">
        {formatUtcMonthLabel(year, month)}
      </div>
      <div className="flex flex-col gap-1.5 text-xs font-medium">
        <div className="flex items-center gap-2">
          <span
            className="size-[7px] shrink-0 rounded-[2px]"
            style={{ backgroundColor: SPEND_COLOR }}
          />
          <span className="min-w-[64px] text-text-dim">Spent</span>
          <span className="tabular-nums text-foreground">{formatMoney(spendMinor, currency)}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="size-[7px] shrink-0 rounded-[2px] bg-positive" />
          <span className="min-w-[64px] text-text-dim">Cashback</span>
          <span className="tabular-nums text-foreground">
            {effectiveCashbackPct === null && spendMinor > 0
              ? 'Unavailable'
              : formatMoney(cashbackMinor, currency)}
          </span>
        </div>
      </div>
    </div>
  )
}

/**
 * The spend chart for anything wider than one month: a bar per month, with
 * a dashed line at the average month so an unusually heavy or light one
 * stands out. The single-month view keeps SpendChart's cumulative
 * this-month-against-last-month comparison, which doesn't translate to
 * all time.
 */
function MonthlySpendChart({ buckets, currency, periodLabel }: MonthlySpendChartProps) {
  const spansYears =
    buckets.length > 0 && buckets[0].key.slice(0, 4) !== buckets[buckets.length - 1].key.slice(0, 4)
  const data: ChartDatum[] = buckets.map((bucket) => ({
    key: bucket.key,
    axisLabel: axisLabel(bucket.key, spansYears),
    spend: bucket.spendMinor / 100,
    bucket,
  }))
  const averageMinor =
    buckets.length > 0
      ? Math.round(buckets.reduce((sum, bucket) => sum + bucket.spendMinor, 0) / buckets.length)
      : 0

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4">
      <div className="flex flex-col gap-2.5">
        <div className="flex items-baseline justify-between gap-3">
          <h3 className="font-heading text-sm font-semibold">Spending by month</h3>
          <span className="text-[11.5px] font-medium whitespace-nowrap text-text-faint">
            {periodLabel}
          </span>
        </div>
        <div className="flex flex-wrap gap-3.5 text-[12px] font-medium">
          <span className="inline-flex items-center gap-1.5" style={{ color: SPEND_COLOR }}>
            <span className="size-2 rounded-[2px] bg-current" />
            Monthly spend
          </span>
          {buckets.length > 1 && (
            <span className="inline-flex items-center gap-1.5" style={{ color: AVERAGE_COLOR }}>
              <span className="size-2 rounded-[2px] border-[1.6px] border-dashed border-current" />
              Average month · {formatMoney(averageMinor, currency)}
            </span>
          )}
        </div>
      </div>
      {buckets.length === 0 ? (
        <p className="flex h-56 items-center justify-center text-sm text-text-faint">
          No spending in this period.
        </p>
      ) : (
        <ChartContainer config={chartConfig} className="aspect-auto h-56 w-full">
          <BarChart data={data} margin={{ left: 0, right: 8, top: 4, bottom: 0 }}>
            <CartesianGrid vertical={false} strokeDasharray="3 3" />
            <XAxis
              dataKey="axisLabel"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={12}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              width={44}
              tickFormatter={(value: number) => formatCompactMoney(value, currency)}
            />
            <Tooltip
              isAnimationActive={false}
              cursor={{ fill: 'var(--color-border)', fillOpacity: 0.35 }}
              content={({ active, payload }) => (
                <MonthlyTooltip active={active} payload={payload} currency={currency} />
              )}
            />
            <Bar dataKey="spend" fill={SPEND_COLOR} radius={[4, 4, 0, 0]} maxBarSize={36} />
            {buckets.length > 1 && (
              <ReferenceLine
                y={averageMinor / 100}
                stroke={AVERAGE_COLOR}
                strokeWidth={2}
                strokeDasharray="5 5"
              />
            )}
          </BarChart>
        </ChartContainer>
      )}
    </div>
  )
}

export default MonthlySpendChart
