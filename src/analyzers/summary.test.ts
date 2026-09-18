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

    expect(summary.clearedSpendMinor).toBe(3000)
    expect(summary.clearedCashbackMinor).toBe(50)
    // 50/3000 * 100, not an average of each row's own rate (3% and 1%)
    expect(summary.effectiveCashbackPct).toBeCloseTo((50 / 3000) * 100)
  })

  it('reports unavailable (null), not 0%, when there is no cleared spend', () => {
    const summary = summarizeTransactions([
      makeTransaction({ status: 'PENDING' }),
      makeTransaction({ status: 'CANCELLED' }),
    ])

    expect(summary.clearedSpendMinor).toBe(0)
    expect(summary.effectiveCashbackPct).toBeNull()
  })

  it('tracks pending amount and count separately, never folded into cleared totals', () => {
    const summary = summarizeTransactions([
      makeTransaction({ id: '1', status: 'CLEARED', amountMinor: 1000 }),
      makeTransaction({ id: '2', status: 'PENDING', amountMinor: 500 }),
      makeTransaction({ id: '3', status: 'PENDING', amountMinor: 300 }),
    ])

    expect(summary.clearedSpendMinor).toBe(1000)
    expect(summary.pendingSpendMinor).toBe(800)
    expect(summary.pendingCount).toBe(2)
  })

  it('counts cancelled rows without including their amount anywhere', () => {
    const summary = summarizeTransactions([
      makeTransaction({ status: 'CLEARED', amountMinor: 1000 }),
      makeTransaction({ status: 'CANCELLED', amountMinor: 999 }),
    ])

    expect(summary.cancelledCount).toBe(1)
    expect(summary.clearedSpendMinor).toBe(1000)
    expect(summary.pendingSpendMinor).toBe(0)
  })

  it('throws if given transactions in more than one currency', () => {
    expect(() =>
      summarizeTransactions([
        makeTransaction({ currency: 'EUR' }),
        makeTransaction({ currency: 'USD' }),
      ]),
    ).toThrow()
  })
})
