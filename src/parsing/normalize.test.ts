import { describe, expect, it } from 'vitest'
import { normalizeText, parseTimestampUtc, toAmountMinorOrNull, toLast4OrNull } from './normalize'

const NBSP = String.fromCharCode(160)
const EM_DASH = String.fromCharCode(8212)

describe('normalizeText', () => {
  it('trims and collapses runs of regular whitespace', () => {
    expect(normalizeText('  Grocery   Stores  ')).toBe('Grocery Stores')
  })

  it('treats a trailing non-breaking space the same as a trailing regular space', () => {
    // this is the real "mojibake artifact" observed in Etherfi's export: a
    // trailing U+00A0 rather than a garbled multi-byte sequence
    const withNbsp = `5300 - Wholesale Club with or without membership fee${NBSP}`
    expect(normalizeText(withNbsp)).toBe('5300 - Wholesale Club with or without membership fee')
  })

  it('leaves other punctuation, including an em dash, untouched', () => {
    const category = `Digital Goods${EM_DASH}Software (Excluding Games)`
    expect(normalizeText(category)).toBe(category)
  })

  it('does not strip a leading MCC prefix', () => {
    expect(normalizeText('5411 - Grocery Stores and Supermarkets')).toBe(
      '5411 - Grocery Stores and Supermarkets',
    )
  })
})

describe('parseTimestampUtc', () => {
  it('parses the observed "YYYY-MM-DD HH:mm:ss UTC" format to ISO 8601', () => {
    expect(parseTimestampUtc('2026-09-13 11:28:48 UTC')).toBe('2026-09-13T11:28:48.000Z')
  })

  it('returns null for a format that does not match, rather than guessing', () => {
    expect(parseTimestampUtc('2026-09-13T11:28:48Z')).toBeNull()
    expect(parseTimestampUtc('13/09/2026 11:28:48 UTC')).toBeNull()
    expect(parseTimestampUtc('not a timestamp')).toBeNull()
  })

  it('returns null for a calendar date that does not exist', () => {
    expect(parseTimestampUtc('2026-02-30 10:00:00 UTC')).toBeNull()
  })
})

describe('toAmountMinorOrNull', () => {
  it('converts a 2-decimal amount to integer minor units', () => {
    expect(toAmountMinorOrNull(4.34)).toBe(434)
    expect(toAmountMinorOrNull(1)).toBe(100)
    expect(toAmountMinorOrNull(0.2)).toBe(20)
  })

  it('rejects an amount with more than 2 fractional digits rather than rounding it', () => {
    expect(toAmountMinorOrNull(4.345)).toBeNull()
  })

  it('rejects non-numeric or non-finite values', () => {
    expect(toAmountMinorOrNull('4.34')).toBeNull()
    expect(toAmountMinorOrNull(null)).toBeNull()
    expect(toAmountMinorOrNull(Number.NaN)).toBeNull()
    expect(toAmountMinorOrNull(Number.POSITIVE_INFINITY)).toBeNull()
  })
})

describe('toLast4OrNull', () => {
  it('accepts a 4-digit string as-is', () => {
    expect(toLast4OrNull('6643')).toBe('6643')
  })

  it('zero-pads a 4-digit number back to a string, since last4 is always 4 digits', () => {
    expect(toLast4OrNull(643)).toBe('0643')
  })

  it('rejects anything that is not exactly 4 digits', () => {
    expect(toLast4OrNull('66431')).toBeNull()
    expect(toLast4OrNull('66A3')).toBeNull()
    expect(toLast4OrNull(null)).toBeNull()
  })
})
