import { describe, expect, it } from 'vitest'
import type { StandardTransaction } from '@/types/transaction'
import { filterTransactions } from './filters'

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

describe('filterTransactions', () => {
  it('keeps only the selected currency', () => {
    const eur = makeTransaction({ id: 'eur', currency: 'EUR' })
    const usd = makeTransaction({ id: 'usd', currency: 'USD' })
    const result = filterTransactions([eur, usd], { currency: 'EUR', year: 2026 })
    expect(result).toEqual([eur])
  })

  it('keeps all cards when cardId is omitted', () => {
    const cardA = makeTransaction({ id: 'a', cardId: 'card-a' })
    const cardB = makeTransaction({ id: 'b', cardId: 'card-b' })
    const result = filterTransactions([cardA, cardB], { currency: 'EUR', year: 2026 })
    expect(result).toEqual([cardA, cardB])
  })

  it('keeps only the selected card when cardId is set', () => {
    const cardA = makeTransaction({ id: 'a', cardId: 'card-a' })
    const cardB = makeTransaction({ id: 'b', cardId: 'card-b' })
    const result = filterTransactions([cardA, cardB], {
      currency: 'EUR',
      year: 2026,
      cardId: 'card-a',
    })
    expect(result).toEqual([cardA])
  })

  it('keeps only the selected year, using the UTC calendar year', () => {
    const inYear = makeTransaction({ id: 'in', timestampUtc: '2026-01-01T00:00:00.000Z' })
    const outOfYear = makeTransaction({ id: 'out', timestampUtc: '2025-12-31T23:59:59.000Z' })
    const result = filterTransactions([inYear, outOfYear], { currency: 'EUR', year: 2026 })
    expect(result).toEqual([inYear])
  })

  it('keeps the whole year when month is omitted, or narrows to one month when set', () => {
    const jan = makeTransaction({ id: 'jan', timestampUtc: '2026-01-15T00:00:00.000Z' })
    const feb = makeTransaction({ id: 'feb', timestampUtc: '2026-02-15T00:00:00.000Z' })

    expect(filterTransactions([jan, feb], { currency: 'EUR', year: 2026 })).toEqual([jan, feb])
    expect(filterTransactions([jan, feb], { currency: 'EUR', year: 2026, month: 1 })).toEqual([jan])
  })
})
