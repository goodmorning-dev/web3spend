import { describe, expect, it } from 'vitest'
import type { StandardTransaction } from '@/types/transaction'
import { ladderFor } from './ladders'
import {
  computeCashbackProgress,
  detectLevel,
  estimateMonthlyCashback,
  stepFromCashback,
} from './progress'

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

describe('computeCashbackProgress, from review', () => {
  const dollars = { ...options, currency: 'USD' }

  function usd(overrides: Partial<StandardTransaction>): Partial<StandardTransaction> {
    return { currency: 'USD', cashbackCurrency: 'USD', ...overrides }
  }

  it("doesn't take a purchase split across two steps for a 3% one", () => {
    // After $1,900, a $120 purchase earns $3.00 on its first $100 and $0.20
    // on the $20 past $2,000. Its 2.67% isn't any one step's rate, so it
    // can't pull the count back onto 3%.
    const progress = computeCashbackProgress(
      month(
        usd({ amountMinor: 190_000, cashbackMinor: 5_700 }),
        usd({ amountMinor: 12_000, cashbackMinor: 320 }),
      ),
      dollars,
    )

    expect(progress.countedUsdMinor).toBe(202_000)
    expect(progress.stepIndex).toBe(1)
    expect(progress.matchedToCashback).toBe(false)
  })

  it('values a purchase in another currency that crosses into the next step at its full amount', () => {
    // At $1,950, a yen purchase worth $100 earns $1.50 at 3% and $0.50 at 1%.
    const progress = computeCashbackProgress(
      month(usd({ amountMinor: 195_000, cashbackMinor: 5_850 }), {
        amountMinor: 1_500_000,
        currency: 'JPY',
        cashbackMinor: 200,
        cashbackCurrency: 'USD',
      }),
      dollars,
    )

    expect(progress.countedUsdMinor).toBe(205_000)
  })

  it('leaves out a no-cashback merchant whose category comes without its code', () => {
    const progress = computeCashbackProgress(
      month(
        usd({ amountMinor: 50_000, categoryRaw: 'Automated Cash Disbursements', cashbackMinor: 0 }),
      ),
      dollars,
    )

    expect(progress.countedUsdMinor).toBe(0)
    expect(progress.purchaseCount).toBe(0)
  })

  it('leaves out a category without its code once another row gives the code away', () => {
    // €5 is too small for the "earned nothing" rule, so only the code
    // seen on September's row can tell this one apart.
    const progress = computeCashbackProgress(
      month(
        {
          amountMinor: 20_000,
          categoryRaw: '6011 - Automated Cash Disbursements',
          cashbackMinor: 0,
          timestampUtc: '2026-09-15T12:00:00.000Z',
        },
        { amountMinor: 500, categoryRaw: 'Automated Cash Disbursements', cashbackMinor: 0 },
        { amountMinor: 8_000 },
      ),
      options,
    )

    expect(progress.countedUsdMinor).toBe(10_000)
  })

  it("doesn't count a purchase that earned nothing, unless it's too small to tell or not ether.fi's final figures", () => {
    const progress = computeCashbackProgress(
      month(
        // earned nothing on €100: a gift card or blocked merchant
        { amountMinor: 10_000, cashbackMinor: 0, categoryRaw: 'Gift Card Store' },
        // €5 at the lowest step would round to nothing anyway
        { amountMinor: 500, cashbackMinor: 0 },
        // pending cashback isn't final yet
        { amountMinor: 4_000, cashbackMinor: 0, status: 'PENDING' },
        // added by hand, with no cashback typed in
        { amountMinor: 2_000, cashbackMinor: 0, source: 'manual' },
        // cashback edited by the person
        { amountMinor: 1_600, cashbackMinor: 0, editedFields: ['cashbackMinor'] },
      ),
      options,
    )

    // €5 + €40 + €20 + €16 at $1.25
    expect(progress.countedUsdMinor).toBe(10_125)
  })

  it("doesn't take its step from a pending, hand-added or edited purchase", () => {
    for (const override of [
      { status: 'PENDING' as const },
      { source: 'manual' as const },
      { editedFields: ['amountMinor' as const] },
    ]) {
      // 1% on €100 would say the month had passed the 3% step, but none of
      // these is ether.fi's final word, so the estimate stands
      const progress = computeCashbackProgress(
        month({ amountMinor: 10_000, cashbackMinor: 100, ...override }),
        options,
      )
      expect(progress.matchedToCashback).toBe(false)
      expect(progress.stepIndex).toBe(0)
    }
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
    // €0.50 earning €0.01 fits 3% (1.5 cents) and 1% (0.5 cents) alike
    expect(stepFromCashback(steps, 50, 1)).toBeNull()
    // nothing earned could mean a purchase that earns no cashback at all
    expect(stepFromCashback(steps, 500, 0)).toBeNull()
    expect(stepFromCashback(steps, 10_000, 220)).toBeNull()
    expect(stepFromCashback(steps, 10_000, 1_000)).toBeNull()
    // $120 split as $100 at 3% and $20 at 1%: within 15% of 3%, but not a
    // 3% purchase rounded to the cent
    expect(stepFromCashback(ladderFor('core', 'USD'), 12_000, 320)).toBeNull()
  })
})

describe('estimateMonthlyCashback', () => {
  it("works out what each level would pay on the month's euro purchases", () => {
    // €640 then €200: Core pays 3% up to €640 and 1% after; Luxe 3% on all
    const transactions = month({ amountMinor: 64_000 }, { amountMinor: 20_000 })

    expect(estimateMonthlyCashback(transactions, { ...options, level: 'core' })).toBe(1_920 + 200)
    expect(estimateMonthlyCashback(transactions, { ...options, level: 'luxe' })).toBe(2_520)
  })

  it('includes purchases in other currencies on the dollar ladder, at their worked-out dollar value', () => {
    // with yen on screen the dollar ladder applies; ¥15,000 earning $3.00
    // at 3% was a $100 purchase
    const transactions = month({
      amountMinor: 1_500_000,
      currency: 'JPY',
      cashbackMinor: 300,
      cashbackCurrency: 'USD',
    })

    expect(
      estimateMonthlyCashback(transactions, { ...options, currency: 'JPY', level: 'core' }),
    ).toBe(300)
    // and it isn't on the euro ladder
    expect(estimateMonthlyCashback(transactions, { ...options, level: 'core' })).toBe(0)
  })

  it('leaves out purchases on the other ladder, and cancelled ones', () => {
    const transactions = month(
      { amountMinor: 10_000 },
      { amountMinor: 10_000, currency: 'USD', cashbackCurrency: 'USD', cashbackMinor: 300 },
      { amountMinor: 10_000, status: 'CANCELLED' },
    )

    expect(estimateMonthlyCashback(transactions, { ...options, level: 'core' })).toBe(300)
  })
})

describe('detectLevel', () => {
  const months = { eurUsdRate: 1.25, year: 2026, month: 10 }

  it('picks Core when the rate dropped to 1% where only Core drops it', () => {
    const transactions = month({ amountMinor: 64_000 }, { amountMinor: 20_000, cashbackMinor: 200 })

    expect(detectLevel(transactions, months)).toEqual({ detected: 'core', possible: ['core'] })
  })

  it("can't tell while every purchase is on 3% below Core's limit", () => {
    const transactions = month({ amountMinor: 20_000 }, { amountMinor: 10_000 })

    expect(detectLevel(transactions, months)).toEqual({
      detected: null,
      possible: ['core', 'luxe', 'pinnacle'],
    })
  })

  it("rules Core out once 3% carries on well past Core's limit", () => {
    const transactions = month({ amountMinor: 72_000 }, { amountMinor: 20_000 })

    expect(detectLevel(transactions, months)).toEqual({
      detected: null,
      possible: ['luxe', 'pinnacle'],
    })
  })

  it('rules Core out when one purchase ran far past its limit and still earned 3% on all of it', () => {
    // $5,000 from nothing: Core would have paid 3% on $2,000, 1% on the next
    // $1,000 and 0.5% on the rest, not $150
    const transactions = month({
      amountMinor: 500_000,
      currency: 'USD',
      cashbackMinor: 15_000,
      cashbackCurrency: 'USD',
    })

    expect(detectLevel(transactions, months)).toEqual({
      detected: null,
      possible: ['luxe', 'pinnacle'],
    })
  })

  it("doesn't let a purchase right at a step's edge decide, since euros convert at ether.fi's own rate", () => {
    // €630 puts the estimate a hair under Core's €640 limit, yet the next
    // purchase earned 1%: at ether.fi's own rate the count was already
    // past it, so that doesn't rule Core out
    const transactions = month({ amountMinor: 63_000 }, { amountMinor: 1_000, cashbackMinor: 10 })

    expect(detectLevel(transactions, months)).toEqual({ detected: 'core', possible: ['core'] })
  })
})
