import { describe, expect, it } from 'vitest'
import { parseRow } from './rowParser'

const NBSP = String.fromCharCode(160)
const EM_DASH = String.fromCharCode(8212)

function makeRawRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    timestamp: '2026-09-13 11:28:48 UTC',
    type: 'card_spend',
    description: 'Merchant 7B925C',
    status: 'PENDING',
    amount: 197.95,
    currency: 'EUR',
    card: '6643',
    'card holder name': 'Person 001',
    'original amount': 197.95,
    'original currency': 'EUR',
    'cashback earned': 3.72,
    'cashback currency': 'EUR',
    category: `5300 - Wholesale Club with or without membership fee${NBSP}`,
    'spending mode': 'Direct Pay',
    ...overrides,
  }
}

describe('parseRow', () => {
  it('parses and normalizes a valid row', () => {
    const result = parseRow(makeRawRow())

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.row).toEqual({
      last4: '6643',
      cardHolderKey: 'person 001',
      timestampUtc: '2026-09-13T11:28:48.000Z',
      type: 'card_spend',
      description: 'Merchant 7B925C',
      status: 'PENDING',
      amountMinor: 19795,
      currency: 'EUR',
      originalAmountMinor: 19795,
      originalCurrency: 'EUR',
      cashbackMinor: 372,
      cashbackCurrency: 'EUR',
      categoryRaw: '5300 - Wholesale Club with or without membership fee',
      spendingMode: 'Direct Pay',
    })
  })

  it('rejects an unrecognized transaction type instead of coercing it', () => {
    const result = parseRow(makeRawRow({ type: 'atm_withdrawal' }))
    expect(result).toEqual({ ok: false, reason: 'Unsupported transaction type: atm_withdrawal' })
  })

  it('accepts a Borrow Mode row, which has the same columns as a Direct Pay one', () => {
    const result = parseRow(makeRawRow({ 'spending mode': 'Borrow Mode' }))
    expect(result).toMatchObject({ ok: true, row: { spendingMode: 'Borrow Mode' } })
  })

  it('rejects an unrecognized spending mode instead of coercing it', () => {
    const result = parseRow(makeRawRow({ 'spending mode': 'Credit Line' }))
    expect(result).toEqual({ ok: false, reason: 'Unsupported spending mode: Credit Line' })
  })

  it('says a spending mode is empty rather than leaving the reason blank', () => {
    expect(parseRow(makeRawRow({ 'spending mode': '' }))).toEqual({
      ok: false,
      reason: 'Unsupported spending mode: (empty)',
    })
    expect(parseRow(makeRawRow({ 'spending mode': null }))).toEqual({
      ok: false,
      reason: 'Unsupported spending mode: (empty)',
    })
  })

  it('rejects an unrecognized status instead of coercing it', () => {
    const result = parseRow(makeRawRow({ status: 'REVERSED' }))
    expect(result.ok).toBe(false)
  })

  it('rejects a malformed timestamp', () => {
    const result = parseRow(makeRawRow({ timestamp: '13/09/2026 11:28:48' }))
    expect(result.ok).toBe(false)
  })

  it('rejects a card value that is not 4 digits', () => {
    const result = parseRow(makeRawRow({ card: 'ABCD' }))
    expect(result.ok).toBe(false)
  })

  it('zero-pads a numeric card value back to 4 digits', () => {
    const result = parseRow(makeRawRow({ card: 643 }))
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.row.last4).toBe('0643')
    }
  })

  it('rejects a currency that is not a 3-letter code', () => {
    const result = parseRow(makeRawRow({ currency: 'EU' }))
    expect(result.ok).toBe(false)
  })

  it('rejects an amount with more than 2 fractional digits', () => {
    const result = parseRow(makeRawRow({ amount: 4.345 }))
    expect(result.ok).toBe(false)
  })

  it('rejects a blank description', () => {
    const result = parseRow(makeRawRow({ description: '   ' }))
    expect(result.ok).toBe(false)
  })

  it('preserves an em dash in category text as genuine content', () => {
    const category = `Digital Goods${EM_DASH}Software (Excluding Games)`
    const result = parseRow(makeRawRow({ category }))
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.row.categoryRaw).toBe(category)
    }
  })
})
