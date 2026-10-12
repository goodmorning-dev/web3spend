import { describe, expect, it } from 'vitest'
import { cashbackOnLadder, ladderCurrency, ladderFor, stepIndexAt } from './ladders'

describe('cashback ladders', () => {
  it("has ether.fi's published steps for each level, in dollars", () => {
    const limits = (level: 'core' | 'luxe' | 'pinnacle', currency: string) =>
      ladderFor(level, currency).map((step) => [step.rate, step.toUsdMinor])

    expect(limits('core', 'USD')).toEqual([
      [0.03, 200_000],
      [0.01, 300_000],
      [0.005, null],
    ])
    expect(limits('core', 'EUR')).toEqual([
      [0.03, 80_000],
      [0.01, 150_000],
      [0.001, null],
    ])
    expect(limits('luxe', 'EUR')[0]).toEqual([0.03, 300_000])
    expect(limits('pinnacle', 'USD')[1]).toEqual([0.01, 8_000_000])
  })

  it('rates euro purchases on the euro ladder and everything else on the dollar one', () => {
    expect(ladderCurrency('EUR')).toBe('EUR')
    expect(ladderCurrency('USD')).toBe('USD')
    expect(ladderCurrency('JPY')).toBe('USD')
  })

  it("finds the step the counter is on, moving on exactly at a step's end", () => {
    const steps = ladderFor('core', 'EUR')
    expect(stepIndexAt(steps, 0)).toBe(0)
    expect(stepIndexAt(steps, 79_999)).toBe(0)
    expect(stepIndexAt(steps, 80_000)).toBe(1)
    expect(stepIndexAt(steps, 1_000_000)).toBe(2)
  })

  it('gives a purchase that crosses into the next step each rate on its own part', () => {
    const steps = ladderFor('core', 'EUR')
    // $100 from $750: $50 at 3% and $50 at 1%
    expect(cashbackOnLadder(steps, 75_000, 10_000)).toBeCloseTo(150 + 50)
    // past the last step's start, only its rate
    expect(cashbackOnLadder(steps, 200_000, 10_000)).toBeCloseTo(10)
  })
})
