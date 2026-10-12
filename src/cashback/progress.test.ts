import { describe, expect, it } from 'vitest'
import type { StandardTransaction } from '@/types/transaction'
import { ladderFor } from './ladders'
import { computeCashbackProgress, stepFromCashback } from './progress'

let nextId = 0

/** A euro purchase in October 2026, with the cashback it would get on the
 * 3% step unless told otherwise. Each one is a day later than the last. */
function purchase(overrides: Partial<StandardTransaction> = {}): StandardTransaction {
  nextId += 1
  const amountMinor = overrides.amountMinor ?? 10_000
  const day = String((nextId % 28) + 1).padStart(2, '0')
  return {
    id: `t${nextId}`,
    cardId: 'card-1',
    timestampUtc: `2026-10-${day}T12:00:00.000Z`,
    type: 'card_spend',
    description: 'Shop',
    status: 'CLEARED',
    amountMinor,
    currency: 'EUR',
    originalAmountMinor: amountMinor,
    originalCurrency: 'EUR',
    cashbackMinor: Math.round(amountMinor * 0.03),
    cashbackCurrency: 'EUR',
    categoryRaw: '5411 - Grocery Stores and Supermarkets',
    spendingMode: 'Direct Pay',
    identityKey: `t${nextId}`,
    importId: 'import-1',
    ...overrides,
  }
}

/** Purchases on consecutive days, in the order given. */
function month(...overrides: Partial<StandardTransaction>[]): StandardTransaction[] {
  nextId = 0
  return overrides.map((override) => purchase(override))
}

// At $1.25 a euro, Core's euro steps end at $800 = €640 and $1,500 = €1,200.
const options = {
  level: 'core' as const,
  currency: 'EUR',
  eurUsdRate: 1.25,
  year: 2026,
  month: 10,
}

describe('computeCashbackProgress', () => {
  it("counts this month's euro purchases at their dollar value, and what's left on the step", () => {
    const progress = computeCashbackProgress(
      month({ amountMinor: 12_000 }, { amountMinor: 8_000 }),
      options,
    )

    expect(progress.countedUsdMinor).toBe(25_000)
    expect(progress.stepIndex).toBe(0)
    expect(progress.leftInStepUsdMinor).toBe(55_000)
    expect(progress.purchaseCount).toBe(2)
    expect(progress.lastPurchaseAt).toBe('2026-10-03T12:00:00.000Z')
    expect(progress.matchedToCashback).toBe(false)
  })

  it('moves on to 1% and then the last step as the month adds up', () => {
    const onOne = computeCashbackProgress(
      month({ amountMinor: 64_000 }, { amountMinor: 10_000, cashbackMinor: 100 }),
      options,
    )
    expect(onOne.stepIndex).toBe(1)
    expect(onOne.leftInStepUsdMinor).toBe(150_000 - 92_500)

    const onLast = computeCashbackProgress(
      month({ amountMinor: 64_000 }, { amountMinor: 60_000, cashbackMinor: 600 }),
      options,
    )
    expect(onLast.stepIndex).toBe(2)
    expect(onLast.leftInStepUsdMinor).toBeNull()
  })

  it('counts pending purchases and takes refunds off, but not cancelled ones, other months or no-cashback merchants', () => {
    const progress = computeCashbackProgress(
      month(
        { amountMinor: 20_000 },
        { amountMinor: 4_000, status: 'PENDING' },
        { amountMinor: -8_000, cashbackMinor: -240 },
        { amountMinor: 50_000, status: 'CANCELLED', cashbackMinor: 0 },
        { amountMinor: 50_000, timestampUtc: '2026-09-30T23:59:00.000Z' },
        {
          amountMinor: 30_000,
          categoryRaw: '6011 - Automated Cash Disbursements',
          cashbackMinor: 0,
        },
        { amountMinor: 30_000, categoryRaw: '7995 - Betting, Casino Gambling', cashbackMinor: 0 },
      ),
      options,
    )

    // (€200 + €40 - €80) at $1.25
    expect(progress.countedUsdMinor).toBe(20_000)
    expect(progress.purchaseCount).toBe(2)
  })

  it('works out the dollar value of a purchase in another currency from its dollar cashback', () => {
    const progress = computeCashbackProgress(
      month(
        { amountMinor: 8_000 },
        // ¥15,290 with $2.94 of cashback at 3%: a $98 purchase
        { amountMinor: 1_529_000, currency: 'JPY', cashbackMinor: 294, cashbackCurrency: 'USD' },
        // no dollar cashback to go by
        { amountMinor: 64_366, currency: 'TRY', cashbackMinor: 0, cashbackCurrency: 'USD' },
      ),
      options,
    )

    expect(progress.countedUsdMinor).toBe(10_000 + 9_800)
    expect(progress.uncountedCount).toBe(1)
  })

  it('shows the dollar ladder, in exact dollars, for dollar purchases', () => {
    const progress = computeCashbackProgress(
      month({
        amountMinor: 50_000,
        currency: 'USD',
        cashbackMinor: 1_500,
        cashbackCurrency: 'USD',
      }),
      { ...options, currency: 'USD' },
    )

    expect(progress.currency).toBe('USD')
    expect(progress.countedUsdMinor).toBe(50_000)
    expect(progress.leftInStepUsdMinor).toBe(150_000)
  })

  it('moves the count up when the latest cashback shows a later step than the estimate', () => {
    // The estimate puts €100 well inside the 3% step, but it earned 1%, so
    // the month had already passed $800 before it.
    const progress = computeCashbackProgress(
      month({ amountMinor: 10_000, cashbackMinor: 100 }),
      options,
    )

    expect(progress.matchedToCashback).toBe(true)
    expect(progress.countedUsdMinor).toBe(80_000 + 12_500)
    expect(progress.stepIndex).toBe(1)
  })

  it('moves the count down when the latest cashback is still 3% but the estimate has passed it', () => {
    const progress = computeCashbackProgress(
      month({ amountMinor: 60_000 }, { amountMinor: 5_000 }, { amountMinor: 5_000 }),
      options,
    )

    expect(progress.matchedToCashback).toBe(true)
    expect(progress.stepIndex).toBe(0)
    expect(progress.leftInStepUsdMinor).toBe(1)
  })

  it('reads as nothing counted yet when the month has no purchases', () => {
    const progress = computeCashbackProgress([], options)

    expect(progress.countedUsdMinor).toBe(0)
    expect(progress.purchaseCount).toBe(0)
    expect(progress.lastPurchaseAt).toBeNull()
    expect(progress.leftInStepUsdMinor).toBe(80_000)
  })
})

describe('stepFromCashback', () => {
  const steps = ladderFor('core', 'EUR')

  it("tells a purchase's step from its cashback, allowing for rounding to the cent", () => {
    expect(stepFromCashback(steps, 2_635, 79)).toBe(0)
    expect(stepFromCashback(steps, 80, 2)).toBe(0)
    expect(stepFromCashback(steps, 10_000, 100)).toBe(1)
    expect(stepFromCashback(steps, 10_000, 10)).toBe(2)
  })

  it("doesn't guess for an amount too small to tell, a split purchase or a boosted rate", () => {
    expect(stepFromCashback(steps, 40, 0)).toBeNull()
    expect(stepFromCashback(steps, 10_000, 220)).toBeNull()
    expect(stepFromCashback(steps, 10_000, 1_000)).toBeNull()
  })
})
