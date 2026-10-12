import type { StandardTransaction } from '@/types/transaction'
import { getUtcMonth, getUtcYear } from '@/utils/dates'
import {
  ladderCurrency,
  ladderFor,
  stepIndexAt,
  type CashbackStep,
  type LadderCurrency,
  type MembershipLevel,
} from './ladders'

/** Merchant codes ether.fi pays no cashback on (cash, investment and
 * brokerage, real estate, financial institutions, gambling). Purchases
 * there don't count toward the month's spending either. */
const NO_CASHBACK_MCCS = new Set(['6011', '6012', '6211', '6513', '6532', '7995'])
const MCC_PATTERN = /^(\d{4})\s*-/

export interface CashbackProgress {
  level: MembershipLevel
  /** The ladder shown: the euro one for euro purchases, the dollar one
   * for everything else. */
  currency: LadderCurrency
  steps: readonly CashbackStep[]
  /** Where the month's counter stands, in dollar cents. An estimate for
   * euro purchases, which ether.fi converts at its own rate as you pay. */
  countedUsdMinor: number
  stepIndex: number
  /** How much is left before the next step, in dollar cents; null on the
   * last step. */
  leftInStepUsdMinor: number | null
  purchaseCount: number
  /** The latest purchase in the month, which is as far as the count goes. */
  lastPurchaseAt: string | null
  /** Whether the cashback on the latest purchases moved the estimate. */
  matchedToCashback: boolean
  /** Purchases in another currency whose dollar value couldn't be worked
   * out (no cashback recorded in dollars), so they're left out. */
  uncountedCount: number
}

function countsTowardSpending(transaction: StandardTransaction): boolean {
  if (transaction.status === 'CANCELLED') {
    return false
  }
  const mcc = MCC_PATTERN.exec(transaction.categoryRaw)?.[1]
  return !(mcc && NO_CASHBACK_MCCS.has(mcc))
}

/** A purchase's value on the month's counter, in dollar cents, or null
 * when it can't be worked out. */
function dollarValue(
  transaction: StandardTransaction,
  counterUsdMinor: number,
  usdSteps: readonly CashbackStep[],
  eurUsdRate: number,
): number | null {
  if (transaction.currency === 'USD') {
    return transaction.amountMinor
  }
  if (transaction.currency === 'EUR') {
    return Math.round(transaction.amountMinor * eurUsdRate)
  }
  // In any other currency, ether.fi records the cashback in dollars at the
  // dollar ladder's rate, which gives the purchase's dollar value back.
  if (transaction.cashbackCurrency === 'USD' && transaction.cashbackMinor !== 0) {
    const rate = usdSteps[stepIndexAt(usdSteps, Math.max(0, counterUsdMinor))].rate
    return Math.round(transaction.cashbackMinor / rate)
  }
  return null
}

/**
 * The step a purchase's own cashback shows it was rated on, or null when
 * that can't be told: an amount too small to tell the rates apart once
 * cashback is rounded to the cent, a purchase with part of it on each of
 * two steps, or a boosted rate that matches no step.
 */
export function stepFromCashback(
  steps: readonly CashbackStep[],
  amountMinor: number,
  cashbackMinor: number,
): number | null {
  if (amountMinor <= 0) {
    return null
  }
  const matches = steps.flatMap((step, index) => {
    const expected = amountMinor * step.rate
    return Math.abs(cashbackMinor - expected) <= 0.5 + expected * 0.15 ? [index] : []
  })
  return matches.length === 1 ? matches[0] : null
}

/**
 * Where the person stands on ether.fi's cashback steps in one calendar
 * month (UTC), across every card and currency, the way ether.fi counts
 * it: approved purchases (cleared or pending) add their dollar value,
 * refunds take theirs off, and cancelled purchases and merchants that pay
 * no cashback don't count.
 *
 * Euro amounts are converted with a reference rate, so the result is an
 * estimate. The latest purchase whose cashback shows which step it was
 * rated on then pins it down: if the estimate disagrees, the count is
 * moved just far enough to agree, since ether.fi's own numbers win.
 */
export function computeCashbackProgress(
  transactions: StandardTransaction[],
  options: {
    level: MembershipLevel
    currency: string
    eurUsdRate: number
    year: number
    month: number
  },
): CashbackProgress {
  const { level, eurUsdRate, year, month } = options
  const currency = ladderCurrency(options.currency)
  const steps = ladderFor(level, currency)
  const usdSteps = ladderFor(level, 'USD')

  const inMonth = transactions.filter(
    (transaction) =>
      getUtcYear(transaction.timestampUtc) === year &&
      getUtcMonth(transaction.timestampUtc) === month,
  )
  const counted = inMonth
    .filter(countsTowardSpending)
    .sort((a, b) => a.timestampUtc.localeCompare(b.timestampUtc))

  // The latest purchase on the shown ladder whose cashback gives its step
  // away. Only one in the ladder's own currency, with its cashback in that
  // currency too, can show its rate.
  let anchor: { index: number; step: number } | null = null
  for (let index = counted.length - 1; index >= 0 && anchor === null; index--) {
    const transaction = counted[index]
    if (transaction.currency === currency && transaction.cashbackCurrency === currency) {
      const step = stepFromCashback(steps, transaction.amountMinor, transaction.cashbackMinor)
      if (step !== null) {
        anchor = { index, step }
      }
    }
  }

  function walk(shiftAtAnchor: number) {
    let counter = 0
    let counterBeforeAnchor = 0
    let uncounted = 0
    counted.forEach((transaction, index) => {
      if (index === anchor?.index) {
        counter += shiftAtAnchor
        counterBeforeAnchor = counter
      }
      const value = dollarValue(transaction, counter, usdSteps, eurUsdRate)
      if (value === null) {
        uncounted += 1
      } else {
        counter += value
      }
    })
    return { counter, counterBeforeAnchor, uncounted }
  }

  let result = walk(0)
  let matchedToCashback = false
  if (anchor) {
    // That purchase sat wholly on its step: the counter was at least the
    // step's start before it, and the purchase ended before the step's end
    // (by a cent, so the count stays on that step).
    const step = steps[anchor.step]
    const value =
      dollarValue(counted[anchor.index], result.counterBeforeAnchor, usdSteps, eurUsdRate) ?? 0
    const lowest = step.fromUsdMinor
    const highest =
      step.toUsdMinor === null ? Infinity : Math.max(lowest, step.toUsdMinor - value - 1)
    const pinned = Math.min(Math.max(result.counterBeforeAnchor, lowest), highest)
    if (pinned !== result.counterBeforeAnchor) {
      result = walk(pinned - result.counterBeforeAnchor)
      matchedToCashback = true
    }
  }

  const countedUsdMinor = Math.max(0, result.counter)
  const stepIndex = stepIndexAt(steps, countedUsdMinor)
  const end = steps[stepIndex].toUsdMinor
  const lastPurchaseAt = inMonth.reduce<string | null>(
    (latest, transaction) =>
      latest === null || transaction.timestampUtc > latest ? transaction.timestampUtc : latest,
    null,
  )

  return {
    level,
    currency,
    steps,
    countedUsdMinor,
    stepIndex,
    leftInStepUsdMinor: end === null ? null : end - countedUsdMinor,
    purchaseCount: counted.filter((transaction) => transaction.amountMinor > 0).length,
    lastPurchaseAt,
    matchedToCashback,
    uncountedCount: result.uncounted,
  }
}
