/**
 * ether.fi's cashback steps for each membership level, as its help center
 * publishes them ("How does cashback work?", checked October 2026):
 * https://help.ether.fi/en/articles/262374-how-does-cashback-work
 *
 * The rate steps down as the month's spending grows. There's one counter
 * per person, in dollars, whatever currency is spent: a euro purchase
 * counts at its dollar value, but it's rated on the euro ladder, which has
 * lower limits and a lower last step (the price of ether.fi's 0% exchange
 * rate on euro purchases). Everything else is rated on the dollar ladder.
 * The counter starts again every calendar month. VIP's limits aren't
 * published and Business has no steps, so neither is here.
 *
 * When ether.fi changes these, this is the one place to update.
 */
export type MembershipLevel = 'core' | 'luxe' | 'pinnacle'

export const MEMBERSHIP_LEVELS: readonly { value: MembershipLevel; label: string }[] = [
  { value: 'core', label: 'Core' },
  { value: 'luxe', label: 'Luxe' },
  { value: 'pinnacle', label: 'Pinnacle' },
]

/** Which of the two ladders a purchase is rated on. */
export type LadderCurrency = 'USD' | 'EUR'

export interface CashbackStep {
  /** As a fraction: 0.03 for 3%. */
  rate: number
  /** Where the step starts and ends on the month's counter, in dollar
   * cents. The last step has no end. */
  fromUsdMinor: number
  toUsdMinor: number | null
}

function ladder(firstLimitUsd: number, secondLimitUsd: number, lastRate: number): CashbackStep[] {
  return [
    { rate: 0.03, fromUsdMinor: 0, toUsdMinor: firstLimitUsd * 100 },
    { rate: 0.01, fromUsdMinor: firstLimitUsd * 100, toUsdMinor: secondLimitUsd * 100 },
    { rate: lastRate, fromUsdMinor: secondLimitUsd * 100, toUsdMinor: null },
  ]
}

const LADDERS: Record<MembershipLevel, Record<LadderCurrency, readonly CashbackStep[]>> = {
  core: { USD: ladder(2_000, 3_000, 0.005), EUR: ladder(800, 1_500, 0.001) },
  luxe: { USD: ladder(10_000, 20_000, 0.005), EUR: ladder(3_000, 6_000, 0.001) },
  pinnacle: { USD: ladder(50_000, 80_000, 0.005), EUR: ladder(16_000, 26_000, 0.001) },
}

/** Euro purchases go on the euro ladder; every other currency on the
 * dollar one. */
export function ladderCurrency(currency: string): LadderCurrency {
  return currency === 'EUR' ? 'EUR' : 'USD'
}

export function ladderFor(level: MembershipLevel, currency: string): readonly CashbackStep[] {
  return LADDERS[level][ladderCurrency(currency)]
}

/** The step the counter is on: the first one it hasn't reached the end of. */
export function stepIndexAt(steps: readonly CashbackStep[], counterUsdMinor: number): number {
  const index = steps.findIndex(
    (step) => step.toUsdMinor === null || counterUsdMinor < step.toUsdMinor,
  )
  return index === -1 ? steps.length - 1 : index
}

/**
 * The cashback, in dollar cents and unrounded, on a purchase worth
 * `amountUsdMinor` that starts at `counterUsdMinor` on the month's
 * counter. Rates apply progressively, so a purchase that crosses into the
 * next step earns each rate on its own part.
 */
export function cashbackOnLadder(
  steps: readonly CashbackStep[],
  counterUsdMinor: number,
  amountUsdMinor: number,
): number {
  const end = counterUsdMinor + amountUsdMinor
  let cashback = 0
  for (const step of steps) {
    const from = Math.max(counterUsdMinor, step.fromUsdMinor)
    const to = Math.min(end, step.toUsdMinor ?? Infinity)
    if (to > from) {
      cashback += (to - from) * step.rate
    }
  }
  return cashback
}

/**
 * cashbackOnLadder in reverse: the dollar amount, in cents, that earns
 * `cashbackUsdMinor` starting at `counterUsdMinor`. Each step's rate
 * applies to the part of the purchase on it, so cashback that reaches past
 * a step's end is worked back at the next step's rate.
 */
export function amountForCashback(
  steps: readonly CashbackStep[],
  counterUsdMinor: number,
  cashbackUsdMinor: number,
): number {
  let position = Math.max(0, counterUsdMinor)
  let remaining = cashbackUsdMinor
  let amount = 0
  for (const step of steps) {
    if (step.toUsdMinor !== null && position >= step.toUsdMinor) {
      continue
    }
    const room = step.toUsdMinor === null ? Infinity : step.toUsdMinor - position
    if (remaining <= room * step.rate) {
      return amount + remaining / step.rate
    }
    amount += room
    remaining -= room * step.rate
    position += room
  }
  return amount
}
