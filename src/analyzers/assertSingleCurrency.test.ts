import { describe, expect, it } from 'vitest'
import type { StandardTransaction } from '@/types/transaction'
import { assertSingleCurrency } from './assertSingleCurrency'

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

describe('assertSingleCurrency', () => {
  it('does not throw for an empty list or a single currency', () => {
    expect(() => assertSingleCurrency([])).not.toThrow()
    expect(() =>
      assertSingleCurrency([makeTransaction(), makeTransaction({ id: 'txn-2' })]),
    ).not.toThrow()
  })

  it('throws when more than one currency is present', () => {
    expect(() =>
      assertSingleCurrency([makeTransaction(), makeTransaction({ id: 'txn-2', currency: 'USD' })]),
    ).toThrow(/EUR, USD/)
  })
})
