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
      categoryRaw: 'Digital Goods: Media, Books, Music',
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

  it('drops a month where the same merchant/amount charged more than once, rather than picking one and counting it normally', () => {
    // A real monthly subscription bills once a month; two charges in the
    // same month means this specific merchant/amount isn't behaving like
    // one, so that month shouldn't count as evidence either way.
    const result = detectSubscriptions([
      makeTransaction({ id: '1', timestampUtc: '2026-01-15T10:00:00.000Z' }),
      makeTransaction({ id: '2', timestampUtc: '2026-01-15T18:00:00.000Z' }),
      makeTransaction({ id: '3', timestampUtc: '2026-02-15T10:00:00.000Z' }),
    ])

    // only February is a single-charge month; one month alone is never enough
    expect(result).toEqual([])
  })

  it('does not let a frequently-repeating small charge manufacture a day match out of sheer volume', () => {
    // Regression test: a merchant charging the same round amount many times
    // a month, on different days each time, used to fragment into several
    // bogus "subscriptions" - one per day that happened to repeat across
    // two otherwise-unrelated months. Every month below has more than one
    // matching charge, so none of them ever qualifies as a single-charge
    // month to compare days against, and nothing should be reported.
    const result = detectSubscriptions([
      makeTransaction({ id: '1', amountMinor: 26, timestampUtc: '2026-06-03T10:00:00.000Z' }),
      makeTransaction({ id: '2', amountMinor: 26, timestampUtc: '2026-06-04T10:00:00.000Z' }),
      makeTransaction({ id: '3', amountMinor: 26, timestampUtc: '2026-06-17T10:00:00.000Z' }),
      makeTransaction({ id: '4', amountMinor: 26, timestampUtc: '2026-07-05T10:00:00.000Z' }),
      makeTransaction({ id: '5', amountMinor: 26, timestampUtc: '2026-07-17T10:00:00.000Z' }),
    ])

    expect(result).toEqual([])
  })

  it('still detects a real monthly charge even when a different, unrelated month for the same merchant/amount is noisy', () => {
    const result = detectSubscriptions([
      // January and February: a clean, single monthly charge on day 15
      makeTransaction({ id: '1', timestampUtc: '2026-01-15T10:00:00.000Z' }),
      makeTransaction({ id: '2', timestampUtc: '2026-02-15T10:00:00.000Z' }),
      // March: an extra same-amount charge landed on a different day too,
      // making that one month noisy on its own, but it shouldn't erase the
      // clean evidence already established in January and February
      makeTransaction({ id: '3', timestampUtc: '2026-03-15T10:00:00.000Z' }),
      makeTransaction({ id: '4', timestampUtc: '2026-03-22T10:00:00.000Z' }),
    ])

    expect(result).toHaveLength(1)
    expect(result[0].occurrences.map((occurrence) => occurrence.monthKey)).toEqual([
      '2026-01',
      '2026-02',
    ])
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

  it('finds the same subscription paid monthly from two different cards, once per card', () => {
    // Regression test: charges used to be grouped across cards before the
    // one-charge-per-month guard ran, so two cards on the same plan looked
    // like two charges a month and both vanished under "All cards", even
    // though filtering to either card on its own found them.
    const result = detectSubscriptions([
      makeTransaction({ id: '1', cardId: 'card-a', timestampUtc: '2026-01-15T10:00:00.000Z' }),
      makeTransaction({ id: '2', cardId: 'card-a', timestampUtc: '2026-02-15T10:00:00.000Z' }),
      makeTransaction({ id: '3', cardId: 'card-b', timestampUtc: '2026-01-15T11:00:00.000Z' }),
      makeTransaction({ id: '4', cardId: 'card-b', timestampUtc: '2026-02-15T11:00:00.000Z' }),
    ])

    expect(result).toHaveLength(2)
    expect(result.map((group) => group.cardId).sort()).toEqual(['card-a', 'card-b'])
    for (const group of result) {
      expect(group.occurrences.every((occurrence) => occurrence.cardId === group.cardId)).toBe(true)
    }
  })
})
