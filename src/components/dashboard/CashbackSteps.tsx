import { ChevronRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { CashbackStep } from '@/cashback/ladders'
import { MEMBERSHIP_LEVELS } from '@/cashback/ladders'
import { EUR_USD_REFERENCE } from '@/cashback/eurUsdReference'
import { Button } from '@/components/ui/button'
import { useCashbackProgress, type CashbackProgressState } from '@/hooks/useCashbackProgress'
import { cn } from '@/lib/utils'
import { formatUtcDate, formatUtcMonthLabel } from '@/utils/dates'
import { formatCashbackRate as formatRate } from '@/utils/format'

const SETTINGS_LINK = '/app/settings#membership'

/** Each step's color in the bar: green while the full rate lasts, gold for
 * the middle step, gray for the last. */
const STEP_COLORS = ['bg-positive', 'bg-primary', 'bg-text-faint']

/** e.g. "October", for sentences where the year is clear. */
function monthName(year: number, month: number): string {
  return new Date(Date.UTC(year, month - 1, 1)).toLocaleDateString(undefined, {
    month: 'long',
    timeZone: 'UTC',
  })
}

/**
 * A dollar amount on the counter in the ladder's own currency, rounded to
 * whole units: euros are converted with the reference rate, so they read
 * as an estimate ("≈ €714").
 */
function formatOnLadder(usdMinor: number, currency: string, eurUsdRate: number): string {
  const amountMinor = currency === 'EUR' ? Math.round(usdMinor / eurUsdRate) : usdMinor
  const formatted = new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amountMinor / 100)
  return currency === 'EUR' ? `≈ ${formatted}` : formatted
}

/** The steps side by side, filled up to where the counter is. The steps
 * with an end are as wide as their size; the open-ended last one gets a
 * fixed slice. */
function StepsBar({
  steps,
  countedUsdMinor,
  currency,
  eurUsdRate,
}: {
  steps: readonly CashbackStep[]
  countedUsdMinor: number
  currency: string
  eurUsdRate: number
}) {
  const finiteTotal = steps.reduce(
    (sum, step) => sum + (step.toUsdMinor === null ? 0 : step.toUsdMinor - step.fromUsdMinor),
    0,
  )
  return (
    <div className="flex gap-1">
      {steps.map((step, index) => {
        const width =
          step.toUsdMinor === null ? 18 : ((step.toUsdMinor - step.fromUsdMinor) / finiteTotal) * 82
        const filled =
          step.toUsdMinor === null
            ? countedUsdMinor >= step.fromUsdMinor
              ? 1
              : 0
            : Math.min(
                1,
                Math.max(
                  0,
                  (countedUsdMinor - step.fromUsdMinor) / (step.toUsdMinor - step.fromUsdMinor),
                ),
              )
        return (
          <div
            key={step.fromUsdMinor}
            className="flex flex-col gap-1.5"
            style={{ width: `${width}%` }}
          >
            <div aria-hidden="true" className="h-2.5 overflow-hidden rounded-full bg-white/[0.06]">
              <div
                className={cn('h-full rounded-full', STEP_COLORS[index])}
                style={{ width: `${filled * 100}%` }}
              />
            </div>
            <p className="flex flex-wrap items-baseline gap-x-1.5 text-xs">
              <span className="font-semibold text-foreground">{formatRate(step.rate)}</span>
              <span className="text-text-faint">
                {step.toUsdMinor === null
                  ? 'after that'
                  : `to ${formatOnLadder(step.toUsdMinor, currency, eurUsdRate)}`}
              </span>
            </p>
          </div>
        )
      })}
    </div>
  )
}

/**
 * How much is left at each of ether.fi's cashback steps this month, for
 * the level picked in Settings. Without a level, it asks for one instead.
 * The count is an estimate for euro purchases (see computeCashbackProgress),
 * and it only goes as far as the last import, which it says.
 */
export function CashbackStepsCard({
  state,
  eurUsdReference = EUR_USD_REFERENCE,
}: {
  state: CashbackProgressState
  eurUsdReference?: { rate: number; date: string }
}) {
  const { progress, year, month } = state
  const name = monthName(year, month)

  if (progress === null) {
    return (
      <section
        aria-labelledby="cashback-steps"
        className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between"
      >
        <div className="flex flex-col gap-0.5">
          <h3 id="cashback-steps" className="font-heading text-sm font-semibold">
            How much is left at 3%?
          </h3>
          <p className="text-[13px] text-text-dim">
            Pick your ether.fi level and this shows where you stand on {name}&apos;s cashback steps.
          </p>
        </div>
        <Button asChild size="sm" className="shrink-0 self-start sm:self-auto">
          <Link to={SETTINGS_LINK}>Pick your level</Link>
        </Button>
      </section>
    )
  }

  const { steps, stepIndex, countedUsdMinor, leftInStepUsdMinor, currency } = progress
  const rate = eurUsdReference.rate
  const step = steps[stepIndex]
  const levelLabel = MEMBERSHIP_LEVELS.find((level) => level.value === progress.level)?.label

  let headline: string
  let next: string
  if (progress.purchaseCount === 0) {
    headline = `Nothing imported for ${name} yet`
    next = 'Import your latest export to see how much is left at 3%.'
  } else if (leftInStepUsdMinor === null) {
    headline = `${formatRate(step.rate)} for the rest of ${name}`
    next = `The higher steps are used up for ${name}.`
  } else {
    headline = `${formatOnLadder(leftInStepUsdMinor, currency, rate)} left at ${formatRate(step.rate)}`
    const later = steps.slice(stepIndex + 1)
    next =
      later.length === 2
        ? `Then ${formatRate(later[0].rate)} up to ${formatOnLadder(later[0].toUsdMinor ?? 0, currency, rate)}, and ${formatRate(later[1].rate)} after that.`
        : `Then ${formatRate(later[0].rate)} for the rest of ${name}.`
  }

  const notes: string[] = []
  if (progress.lastPurchaseAt) {
    notes.push(
      `${formatOnLadder(countedUsdMinor, currency, rate)} counted so far, from purchases up to ${formatUtcDate(progress.lastPurchaseAt)}.`,
    )
  }
  if (currency === 'EUR') {
    notes.push(
      progress.matchedToCashback
        ? 'Adjusted to match the cashback on your latest purchase.'
        : `An estimate: ether.fi converts euro spending at its own rate as you pay, and this uses the ECB's rate from ${formatUtcDate(eurUsdReference.date)}.`,
    )
  }
  if (progress.uncountedCount > 0) {
    notes.push(
      `${progress.uncountedCount} ${progress.uncountedCount === 1 ? 'purchase' : 'purchases'} in another currency couldn't be counted.`,
    )
  }

  return (
    <section
      aria-labelledby="cashback-steps"
      className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-4"
    >
      <div className="flex items-baseline justify-between gap-3">
        <div>
          <h3 id="cashback-steps" className="font-heading text-sm font-semibold">
            Cashback steps
          </h3>
          <p className="text-[11.5px] font-medium text-text-faint">
            {formatUtcMonthLabel(year, month)} · {levelLabel} ·{' '}
            {currency === 'EUR' ? 'euro purchases' : 'dollar purchases'}
          </p>
        </div>
        <Link
          to={SETTINGS_LINK}
          className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-primary hover:underline"
        >
          Change level
          <ChevronRight className="size-3.5" />
        </Link>
      </div>

      <div className="flex flex-col gap-0.5">
        <p className="font-heading text-xl font-semibold tabular-nums">{headline}</p>
        <p className="text-sm text-text-dim">{next}</p>
      </div>

      <StepsBar
        steps={steps}
        countedUsdMinor={countedUsdMinor}
        currency={currency}
        eurUsdRate={rate}
      />

      {notes.length > 0 && <p className="text-xs text-text-faint">{notes.join(' ')}</p>}
    </section>
  )
}

/** The cashback steps for this month, on the ladder for the dashboard's
 * currency (euro purchases have their own). */
function CashbackSteps({ currency }: { currency: string }) {
  const state = useCashbackProgress(currency)
  return state ? <CashbackStepsCard state={state} /> : null
}

export default CashbackSteps
