import { describe, expect, it } from 'vitest'
import type { StandardTransaction } from '@/types/transaction'
import { summarizeTransactions } from './summary'

function makeTransaction(overrides: Partial<StandardTransaction> = {}): StandardTransaction {
  return {
    id: 'txn-1',
    cardId: 'card-1',
    timestampUtc: '2026-01-15T10:00:00.000Z',
    type: 'card_spend',
    description: 'Coffee Shop',
    status: 'CLEARED',
    amountMinor: 450,
    currency: 'EUR',
    originalAmountMinor: 450,
    originalCurrency: 'EUR',
    cashbackMinor: 9,
    cashbackCurrency: 'EUR',
    categoryRaw: 'Groceries',
    spendingMode: 'Direct Pay',
    identityKey: 'key-1',
    importId: 'import-1',
    ...overrides,
  }
}

describe('summarizeTransactions', () => {
  it('sums cleared spend and cashback, and computes the effective rate from the sums', () => {
    const summary = summarizeTransactions([
      makeTransaction({ id: '1', amountMinor: 1000, cashbackMinor: 30 }),
      makeTransaction({ id: '2', amountMinor: 2000, cashbackMinor: 20 }),
    ])

    expect(summary.spendMinor).toBe(3000)
    expect(summary.purchaseCount).toBe(2)
    expect(summary.cashbackMinor).toBe(50)
    // 50/3000 * 100, not an average of each row's own rate (3% and 1%)
    expect(summary.effectiveCashbackPct).toBeCloseTo((50 / 3000) * 100)
  })

  it('counts cleared and pending purchases, but not a refund-like or cancelled row', () => {
    const summary = summarizeTransactions([
      makeTransaction({ id: '1', status: 'CLEARED', amountMinor: 1000 }),
      makeTransaction({ id: '2', status: 'CLEARED', amountMinor: -400 }),
      makeTransaction({ id: '3', status: 'PENDING' }),
      makeTransaction({ id: '4', status: 'CANCELLED' }),
    ])

    expect(summary.purchaseCount).toBe(2)
  })

  it('reports unavailable (null), not 0%, when there is no spend', () => {
    const summary = summarizeTransactions([makeTransaction({ status: 'CANCELLED' })])

    expect(summary.spendMinor).toBe(0)
    expect(summary.effectiveCashbackPct).toBeNull()
  })

  it('folds pending purchases into spend and cashback, and says how many are pending', () => {
    const summary = summarizeTransactions([
      makeTransaction({ id: '1', status: 'CLEARED', amountMinor: 1000, cashbackMinor: 30 }),
      makeTransaction({ id: '2', status: 'PENDING', amountMinor: 500, cashbackMinor: 15 }),
      makeTransaction({ id: '3', status: 'PENDING', amountMinor: 300, cashbackMinor: 9 }),
    ])

    expect(summary.spendMinor).toBe(1800)
    expect(summary.cashbackMinor).toBe(54)
    expect(summary.purchaseCount).toBe(3)
    expect(summary.pendingCount).toBe(2)
    expect(summary.effectiveCashbackPct).toBeCloseTo(3)
  })

  it('counts cancelled rows without including their amount anywhere', () => {
    const summary = summarizeTransactions([
      makeTransaction({ status: 'CLEARED', amountMinor: 1000 }),
      makeTransaction({ status: 'CANCELLED', amountMinor: 999 }),
    ])

    expect(summary.cancelledCount).toBe(1)
    expect(summary.spendMinor).toBe(1000)
    expect(summary.pendingCount).toBe(0)
  })

  it('throws if given transactions in more than one currency', () => {
    expect(() =>
      summarizeTransactions([
        makeTransaction({ currency: 'EUR' }),
        makeTransaction({ currency: 'USD' }),
      ]),
    ).toThrow()
  })

  it('excludes a refund-like row (negative amount) from spend instead of subtracting it', () => {
    const summary = summarizeTransactions([
      makeTransaction({ id: '1', amountMinor: 1000, cashbackMinor: 0 }),
      makeTransaction({ id: '2', amountMinor: -400, cashbackMinor: 0 }),
    ])

    expect(summary.spendMinor).toBe(1000)
  })

  it("excludes a refund-like row's cashback too, even if it reports some", () => {
    const summary = summarizeTransactions([
      makeTransaction({ id: '1', amountMinor: 1000, cashbackMinor: 30 }),
      makeTransaction({ id: '2', amountMinor: -400, cashbackMinor: 5 }),
    ])

    expect(summary.cashbackMinor).toBe(30)
  })

  it('reports unavailable, not a mixed-currency figure, when cashback currencies differ', () => {
    const summary = summarizeTransactions([
      makeTransaction({ id: '1', currency: 'EUR', cashbackCurrency: 'EUR', cashbackMinor: 20 }),
      makeTransaction({ id: '2', currency: 'EUR', cashbackCurrency: 'USD', cashbackMinor: 30 }),
    ])

    expect(summary.effectiveCashbackPct).toBeNull()
  })

  it('still sums the cashback that is in a compatible currency when another row is not', () => {
    const summary = summarizeTransactions([
      makeTransaction({ id: '1', currency: 'EUR', cashbackCurrency: 'EUR', cashbackMinor: 20 }),
      makeTransaction({ id: '2', currency: 'EUR', cashbackCurrency: 'USD', cashbackMinor: 30 }),
    ])

    expect(summary.cashbackMinor).toBe(20)
  })

  it('marks cashback incomplete when any purchase has a mismatched cashback currency', () => {
    const summary = summarizeTransactions([
      makeTransaction({ id: '1', currency: 'EUR', cashbackCurrency: 'EUR', cashbackMinor: 20 }),
      makeTransaction({ id: '2', currency: 'EUR', cashbackCurrency: 'USD', cashbackMinor: 30 }),
    ])

    expect(summary.cashbackComplete).toBe(false)
  })

  it('marks cashback complete when every purchase has a matching cashback currency', () => {
    const summary = summarizeTransactions([
      makeTransaction({ id: '1', currency: 'EUR', cashbackCurrency: 'EUR', cashbackMinor: 20 }),
      makeTransaction({ id: '2', currency: 'EUR', cashbackCurrency: 'EUR', cashbackMinor: 30 }),
    ])

    expect(summary.cashbackComplete).toBe(true)
  })

  it('marks cashback complete when there is no spend at all, unlike effectiveCashbackPct', () => {
    const summary = summarizeTransactions([makeTransaction({ status: 'CANCELLED' })])

    expect(summary.effectiveCashbackPct).toBeNull()
    expect(summary.cashbackComplete).toBe(true)
  })
})
