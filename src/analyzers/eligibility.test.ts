import { describe, expect, it } from 'vitest'
import type { StandardTransaction } from '@/types/transaction'
import {
  hasCompatibleCashbackCurrency,
  isEligiblePurchase,
  transactionCashbackPct,
} from './eligibility'

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

describe('isEligiblePurchase', () => {
  it('accepts a CLEARED row with a non-negative amount', () => {
    expect(isEligiblePurchase(makeTransaction({ amountMinor: 450 }))).toBe(true)
    expect(isEligiblePurchase(makeTransaction({ amountMinor: 0 }))).toBe(true)
  })

  it('rejects a refund-like CLEARED row (a negative amount)', () => {
    expect(isEligiblePurchase(makeTransaction({ amountMinor: -400 }))).toBe(false)
  })

  it('rejects a non-CLEARED row regardless of amount sign', () => {
    expect(isEligiblePurchase(makeTransaction({ status: 'PENDING', amountMinor: 100 }))).toBe(false)
    expect(isEligiblePurchase(makeTransaction({ status: 'CANCELLED', amountMinor: 100 }))).toBe(
      false,
    )
  })
})

describe('hasCompatibleCashbackCurrency', () => {
  it('accepts a row whose cashback currency matches its spend currency', () => {
    expect(
      hasCompatibleCashbackCurrency(makeTransaction({ currency: 'EUR', cashbackCurrency: 'EUR' })),
    ).toBe(true)
  })

  it('rejects a row whose cashback currency differs from its spend currency', () => {
    expect(
      hasCompatibleCashbackCurrency(makeTransaction({ currency: 'EUR', cashbackCurrency: 'USD' })),
    ).toBe(false)
  })
})

describe('transactionCashbackPct', () => {
  it('computes cashback as a percentage of the spend on the same row', () => {
    expect(transactionCashbackPct(makeTransaction({ amountMinor: 450, cashbackMinor: 9 }))).toBe(2)
  })

  it('is null when the cashback currency differs from the spend currency', () => {
    expect(
      transactionCashbackPct(
        makeTransaction({ currency: 'EUR', cashbackCurrency: 'USD', amountMinor: 450 }),
      ),
    ).toBeNull()
  })

  it('is null when there is no positive spend to divide by', () => {
    expect(transactionCashbackPct(makeTransaction({ amountMinor: 0 }))).toBeNull()
    expect(transactionCashbackPct(makeTransaction({ amountMinor: -400 }))).toBeNull()
  })
})
