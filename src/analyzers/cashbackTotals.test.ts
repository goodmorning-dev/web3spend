import { describe, expect, it } from 'vitest'
import type { StandardTransaction } from '@/types/transaction'
import { addCashback, listCashbackTotals, type CashbackTotal } from './cashbackTotals'

function makeTransaction(overrides: Partial<StandardTransaction> = {}): StandardTransaction {
  return {
    id: 'txn-1',
    cardId: 'card-1',
    timestampUtc: '2026-09-03T09:00:00.000Z',
    type: 'card_spend',
    description: 'Shop',
    status: 'CLEARED',
    amountMinor: 1529000,
    currency: 'JPY',
    originalAmountMinor: 1529000,
    originalCurrency: 'JPY',
    cashbackMinor: 294,
    cashbackCurrency: 'USD',
    categoryRaw: 'Cat',
    spendingMode: 'Direct Pay',
    identityKey: 'key-1',
    importId: 'import-1',
    ...overrides,
  }
}

function totalsOf(transactions: StandardTransaction[], spendCurrency = 'JPY'): CashbackTotal[] {
  const totals = new Map<string, CashbackTotal>()
  for (const transaction of transactions) {
    addCashback(totals, transaction)
  }
  return listCashbackTotals(totals, spendCurrency)
}

describe('cashback totals', () => {
  it('sums cashback per currency it was recorded in, with the pending part apart', () => {
    expect(
      totalsOf([
        makeTransaction({ id: '1', cashbackMinor: 294 }),
        makeTransaction({ id: '2', cashbackMinor: 98, status: 'PENDING' }),
      ]),
    ).toEqual([{ currency: 'USD', amountMinor: 392, pendingMinor: 98 }])
  })

  it("lists the purchases' own currency first, then the rest alphabetically", () => {
    const currencies = totalsOf([
      makeTransaction({ id: '1', cashbackCurrency: 'USD', cashbackMinor: 10 }),
      makeTransaction({ id: '2', cashbackCurrency: 'JPY', cashbackMinor: 500 }),
      makeTransaction({ id: '3', cashbackCurrency: 'EUR', cashbackMinor: 5 }),
    ]).map((total) => total.currency)

    expect(currencies).toEqual(['JPY', 'EUR', 'USD'])
  })

  it('leaves out a currency whose cashback came to nothing', () => {
    expect(
      totalsOf([
        makeTransaction({ id: '1', cashbackCurrency: 'USD', cashbackMinor: 0 }),
        makeTransaction({ id: '2', cashbackCurrency: 'JPY', cashbackMinor: 500 }),
      ]).map((total) => total.currency),
    ).toEqual(['JPY'])
    expect(totalsOf([makeTransaction({ cashbackMinor: 0 })])).toEqual([])
  })
})
