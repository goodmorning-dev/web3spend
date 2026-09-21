import { describe, expect, it } from 'vitest'
import type { StandardTransaction } from '@/types/transaction'
import { detectSubscriptions } from './subscriptions'

function makeTransaction(overrides: Partial<StandardTransaction> = {}): StandardTransaction {
  return {
    id: 'txn-1',
    cardId: 'card-1',
    timestampUtc: '2026-01-15T10:00:00.000Z',
    type: 'card_spend',
    description: 'Netflix',
    status: 'CLEARED',
    amountMinor: 1399,
    currency: 'EUR',
    originalAmountMinor: 1399,
    originalCurrency: 'EUR',
    cashbackMinor: 35,
    cashbackCurrency: 'EUR',
    categoryRaw: 'Digital Goods: Media, Books, Music',
    spendingMode: 'Direct Pay',
    identityKey: 'key-1',
    importId: 'import-1',
    ...overrides,
  }
}

describe('detectSubscriptions', () => {
  it('flags the same merchant charging the same amount on the same day of the month, twice', () => {
    const result = detectSubscriptions([
      makeTransaction({ id: '1', timestampUtc: '2026-01-15T10:00:00.000Z' }),
      makeTransaction({ id: '2', timestampUtc: '2026-02-15T10:00:00.000Z' }),
    ])

    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({
      description: 'Netflix',
      currency: 'EUR',
      amountMinor: 1399,
      dayOfMonth: 15,
    })
    expect(result[0].occurrences.map((occurrence) => occurrence.monthKey)).toEqual([
      '2026-01',
      '2026-02',
    ])
  })

  it('does not flag a single occurrence: there is nothing recurring about it yet', () => {
    const result = detectSubscriptions([
      makeTransaction({ id: '1', timestampUtc: '2026-01-15T10:00:00.000Z' }),
    ])

    expect(result).toEqual([])
  })

  it('does not flag two charges on different days of the month', () => {
    const result = detectSubscriptions([
      makeTransaction({ id: '1', timestampUtc: '2026-01-15T10:00:00.000Z' }),
      makeTransaction({ id: '2', timestampUtc: '2026-02-16T10:00:00.000Z' }),
    ])

    expect(result).toEqual([])
  })

  it('does not flag the same merchant and day with a different amount', () => {
    const result = detectSubscriptions([
      makeTransaction({ id: '1', timestampUtc: '2026-01-15T10:00:00.000Z', amountMinor: 1399 }),
      makeTransaction({ id: '2', timestampUtc: '2026-02-15T10:00:00.000Z', amountMinor: 1499 }),
    ])

    expect(result).toEqual([])
  })

  it('does not flag the same merchant, day, and amount in a different currency', () => {
    const result = detectSubscriptions([
      makeTransaction({ id: '1', timestampUtc: '2026-01-15T10:00:00.000Z', currency: 'EUR' }),
      makeTransaction({ id: '2', timestampUtc: '2026-02-15T10:00:00.000Z', currency: 'USD' }),
    ])

    expect(result).toEqual([])
  })

  it('excludes a PENDING or CANCELLED row from forming or completing a match', () => {
    const result = detectSubscriptions([
      makeTransaction({ id: '1', timestampUtc: '2026-01-15T10:00:00.000Z', status: 'CLEARED' }),
      makeTransaction({ id: '2', timestampUtc: '2026-02-15T10:00:00.000Z', status: 'PENDING' }),
    ])

    expect(result).toEqual([])
  })

  it('excludes a refund-like (negative-amount) row', () => {
    const result = detectSubscriptions([
      makeTransaction({ id: '1', timestampUtc: '2026-01-15T10:00:00.000Z', amountMinor: -1399 }),
      makeTransaction({ id: '2', timestampUtc: '2026-02-15T10:00:00.000Z', amountMinor: -1399 }),
    ])

    expect(result).toEqual([])
  })

  it('counts only one occurrence per month even with two matching charges in the same month', () => {
    const result = detectSubscriptions([
      makeTransaction({ id: '1', timestampUtc: '2026-01-15T10:00:00.000Z' }),
      makeTransaction({ id: '2', timestampUtc: '2026-01-15T18:00:00.000Z' }),
      makeTransaction({ id: '3', timestampUtc: '2026-02-15T10:00:00.000Z' }),
    ])

    expect(result).toHaveLength(1)
    expect(result[0].occurrences).toHaveLength(2)
  })

  it('sorts detected subscriptions by most recently charged first', () => {
    const result = detectSubscriptions([
      makeTransaction({
        id: '1',
        description: 'Netflix',
        timestampUtc: '2026-01-15T10:00:00.000Z',
      }),
      makeTransaction({
        id: '2',
        description: 'Netflix',
        timestampUtc: '2026-02-15T10:00:00.000Z',
      }),
      makeTransaction({
        id: '3',
        description: 'Spotify',
        amountMinor: 999,
        timestampUtc: '2026-02-01T10:00:00.000Z',
      }),
      makeTransaction({
        id: '4',
        description: 'Spotify',
        amountMinor: 999,
        timestampUtc: '2026-03-01T10:00:00.000Z',
      }),
    ])

    expect(result.map((group) => group.description)).toEqual(['Spotify', 'Netflix'])
  })

  it('keeps every distinct merchant/amount/day combination as its own group', () => {
    const result = detectSubscriptions([
      makeTransaction({
        id: '1',
        description: 'Netflix',
        timestampUtc: '2026-01-15T10:00:00.000Z',
      }),
      makeTransaction({
        id: '2',
        description: 'Netflix',
        timestampUtc: '2026-02-15T10:00:00.000Z',
      }),
      makeTransaction({
        id: '3',
        description: 'Spotify',
        amountMinor: 999,
        timestampUtc: '2026-01-05T10:00:00.000Z',
      }),
      makeTransaction({
        id: '4',
        description: 'Spotify',
        amountMinor: 999,
        timestampUtc: '2026-02-05T10:00:00.000Z',
      }),
    ])

    expect(result).toHaveLength(2)
    expect(result.map((group) => group.description).sort()).toEqual(['Netflix', 'Spotify'])
  })
})
