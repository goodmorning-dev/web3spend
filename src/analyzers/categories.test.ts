import { describe, expect, it } from 'vitest'
import type { StandardTransaction } from '@/types/transaction'
import { aggregateByCategory } from './categories'

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

describe('aggregateByCategory', () => {
  it('sums spend per raw category and computes each share of the total', () => {
    const result = aggregateByCategory([
      makeTransaction({ id: '1', categoryRaw: 'Groceries', amountMinor: 3000 }),
      makeTransaction({ id: '2', categoryRaw: 'Groceries', amountMinor: 1000 }),
      makeTransaction({ id: '3', categoryRaw: 'Transport', amountMinor: 1000 }),
    ])

    expect(result).toEqual([
      { category: 'Groceries', spendMinor: 4000, share: 0.8 },
      { category: 'Transport', spendMinor: 1000, share: 0.2 },
    ])
  })

  it('sorts descending by spend', () => {
    const result = aggregateByCategory([
      makeTransaction({ id: '1', categoryRaw: 'Small', amountMinor: 100 }),
      makeTransaction({ id: '2', categoryRaw: 'Big', amountMinor: 900 }),
    ])

    expect(result.map((bucket) => bucket.category)).toEqual(['Big', 'Small'])
  })

  it('excludes non-cleared rows from both the category totals and the shares', () => {
    const result = aggregateByCategory([
      makeTransaction({ id: '1', categoryRaw: 'Groceries', amountMinor: 1000, status: 'CLEARED' }),
      makeTransaction({ id: '2', categoryRaw: 'Travel', amountMinor: 5000, status: 'PENDING' }),
    ])

    expect(result).toEqual([{ category: 'Groceries', spendMinor: 1000, share: 1 }])
  })

  it('returns an empty list, not a division-by-zero share, when nothing is cleared', () => {
    const result = aggregateByCategory([makeTransaction({ status: 'PENDING' })])
    expect(result).toEqual([])
  })

  it('throws if given transactions in more than one currency', () => {
    expect(() =>
      aggregateByCategory([
        makeTransaction({ currency: 'EUR' }),
        makeTransaction({ currency: 'USD' }),
      ]),
    ).toThrow()
  })

  it('excludes a refund-like row (negative amount) instead of subtracting it from its category', () => {
    const result = aggregateByCategory([
      makeTransaction({ id: '1', categoryRaw: 'Groceries', amountMinor: 1000 }),
      makeTransaction({ id: '2', categoryRaw: 'Groceries', amountMinor: -400 }),
    ])

    expect(result).toEqual([{ category: 'Groceries', spendMinor: 1000, share: 1 }])
  })

  it('merges an MCC-coded and a bare variant of the same category into one bucket', () => {
    // Etherfi's export mixes both forms for what is otherwise the same
    // category (observed on PENDING rows in practice).
    const result = aggregateByCategory([
      makeTransaction({
        id: '1',
        categoryRaw: '5411 - Grocery Stores and Supermarkets',
        amountMinor: 3000,
      }),
      makeTransaction({
        id: '2',
        categoryRaw: 'Grocery Stores and Supermarkets',
        amountMinor: 1000,
      }),
    ])

    // the MCC-coded label wins as the more specific representative
    expect(result).toEqual([
      { category: '5411 - Grocery Stores and Supermarkets', spendMinor: 4000, share: 1 },
    ])
  })
})
