import { EUR_USD_REFERENCE } from '@/cashback/eurUsdReference'
import { MEMBERSHIP_LEVELS, type CashbackStep, type MembershipLevel } from '@/cashback/ladders'
import { useCashbackProgress, type CashbackStepsState } from '@/hooks/useCashbackProgress'
import { cn } from '@/lib/utils'
import { setMembershipLevel } from '@/storage/settings'
import { formatUtcDate, formatUtcMonthLabel } from '@/utils/dates'
import { formatCashbackRate as formatRate, formatMoney } from '@/utils/format'

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

/** A cashback amount in the ladder's currency, to the cent: "≈ €23.71"
 * for euros, which go through the reference rate. */
function formatCashback(amountMinor: number, currency: string): string {
  const formatted = formatMoney(amountMinor, currency)
  return currency === 'EUR' ? `≈ ${formatted}` : formatted
}

/** "+€4.64", "−€1.20" or "same", against the level shown. */
function formatDifference(differenceMinor: number, currency: string): string {
  if (differenceMinor === 0) {
    return 'same'
  }
  const sign = differenceMinor > 0 ? '+' : '−'
  return `${sign}${formatMoney(Math.abs(differenceMinor), currency)}`
}

/** "Luxe and Pinnacle", "Core, Luxe and Pinnacle". */
function listLevels(levels: MembershipLevel[]): string {
  const labels = levels.map(levelLabel)
  return labels.length <= 1
    ? (labels[0] ?? '')
    : `${labels.slice(0, -1).join(', ')} and ${labels[labels.length - 1]}`
}

function levelLabel(level: MembershipLevel): string {
  return MEMBERSHIP_LEVELS.find((option) => option.value === level)?.label ?? level
}

/**
 * Where a month stands on ether.fi's cashback steps: how much has counted
 * toward them, the steps for the level shown, and a pill per level with
 * roughly what it would pay this month, so the levels can be compared at
 * a glance and switched with a click. The level shown is the one picked,
 * or else the one the month's cashback fits (see detectLevel), so nobody
 * has to pick one first. Euro amounts are estimates (see
 * computeCashbackProgress), and the count only goes as far as the last
 * import, which it says.
 */
export function CashbackStepsCard({
  state,
  onPickLevel,
  eurUsdReference = EUR_USD_REFERENCE,
}: {
  state: CashbackStepsState
  onPickLevel: (level: MembershipLevel) => void
  eurUsdReference?: { rate: number; date: string }
}) {
  const { progress, year, month, isCurrentMonth, saved, detection, level, estimates } = state
  const { steps, stepIndex, countedUsdMinor, leftInStepUsdMinor, currency } = progress
  const rate = eurUsdReference.rate
  const name = monthName(year, month)
  const step = steps[stepIndex]
  const next = steps[stepIndex + 1]

  let headline: string
  let status: string
  if (progress.purchaseCount === 0) {
    headline = isCurrentMonth ? `Nothing imported for ${name} yet` : `No purchases in ${name}`
    status = isCurrentMonth
      ? 'Import your latest export to see where this month stands.'
      : `Nothing counted toward ${name}'s steps.`
  } else {
    headline = `${formatOnLadder(countedUsdMinor, currency, rate)} counted toward the steps`
    if (!isCurrentMonth) {
      status = `${levelLabel(level)}: ${name} ended on ${formatRate(step.rate)}.`
    } else if (leftInStepUsdMinor === null || !next) {
      status = `${levelLabel(level)}: ${formatRate(step.rate)} for the rest of ${name}.`
    } else {
      status = `${levelLabel(level)}: on ${formatRate(step.rate)}, ${formatOnLadder(leftInStepUsdMinor, currency, rate)} left before ${formatRate(next.rate)}.`
    }
  }

  const notes: string[] = []
  if (progress.lastPurchaseAt) {
    notes.push(`Counted from purchases up to ${formatUtcDate(progress.lastPurchaseAt)}.`)
  }
  if (
    progress.purchaseCount > 0 &&
    detection.possible.length > 0 &&
    !detection.possible.includes(level)
  ) {
    notes.push(
      `Your cashback in ${name} fits ${listLevels(detection.possible)}, not ${levelLabel(level)}, so this is ${levelLabel(level)}'s steps for the same spending.`,
    )
  } else if (detection.detected === null && saved === null && progress.purchaseCount > 0) {
    notes.push(
      detection.possible.length === MEMBERSHIP_LEVELS.length
        ? `Every level pays 3% this far into ${name}, so your level can't be told from your cashback yet. Pick yours above.`
        : detection.possible.length > 1
          ? `Your cashback this month fits ${listLevels(detection.possible)} alike. Pick yours above.`
          : `Your cashback this month doesn't match any level's published steps. Pick yours above.`,
    )
  }
  notes.push(
    "Each level's cashback is a rough figure from this month's spending, for comparing them.",
  )
  if (currency === 'EUR') {
    notes.push(
      progress.matchedToCashback
        ? 'The count is adjusted to match the cashback on your latest purchase.'
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
      <div>
        <h3 id="cashback-steps" className="font-heading text-sm font-semibold">
          Cashback steps
        </h3>
        <p className="text-[11.5px] font-medium text-text-faint">
          {formatUtcMonthLabel(year, month)} ·{' '}
          {currency === 'EUR' ? 'euro purchases' : 'dollar purchases'}
        </p>
      </div>

      <div className="flex flex-col gap-0.5">
        <p className="font-heading text-xl font-semibold tabular-nums">{headline}</p>
        <p className="text-sm text-text-dim">{status}</p>
      </div>

      <StepsBar
        steps={steps}
        countedUsdMinor={countedUsdMinor}
        currency={currency}
        eurUsdRate={rate}
      />

      <div className="grid gap-2 sm:grid-cols-3">
        {MEMBERSHIP_LEVELS.map(({ value, label }) => {
          const selected = value === level
          const tag =
            saved === value ? 'your level' : detection.detected === value ? 'detected' : null
          return (
            <button
              key={value}
              type="button"
              aria-pressed={selected}
              onClick={() => onPickLevel(value)}
              className={cn(
                'flex cursor-pointer flex-col gap-0.5 rounded-xl border px-3 py-2 text-left transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
                selected
                  ? 'border-primary/60 bg-primary/10'
                  : 'border-border bg-background/40 hover:border-white/20',
              )}
            >
              <span className="flex items-baseline justify-between gap-2">
                <span className={cn('text-sm font-semibold', selected && 'text-primary')}>
                  {label}
                </span>
                <span className="text-sm font-semibold tabular-nums">
                  {formatCashback(estimates[value], currency)}
                </span>
              </span>
              <span className="flex items-baseline justify-between gap-2 text-xs">
                <span className="text-text-faint">{tag}</span>
                {!selected && (
                  <span
                    className={cn(
                      'tabular-nums',
                      estimates[value] > estimates[level] ? 'text-positive' : 'text-text-faint',
                    )}
                  >
                    {formatDifference(estimates[value] - estimates[level], currency)}
                  </span>
                )}
              </span>
            </button>
          )
        })}
      </div>

      <p className="text-xs text-text-faint">{notes.join(' ')}</p>
    </section>
  )
}

/** The cashback steps for the month the dashboard shows (this month on
 * "All time"), on the ladder for its currency, since euro purchases have
 * steps of their own. Clicking a level's pill saves it as the person's
 * level. */
function CashbackSteps({
  currency,
  period,
}: {
  currency: string
  period: { year: number; month: number } | null
}) {
  const state = useCashbackProgress(currency, period)
  return state ? (
    <CashbackStepsCard state={state} onPickLevel={(level) => void setMembershipLevel(level)} />
  ) : null
}

export default CashbackSteps
