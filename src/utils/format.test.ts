import { describe, expect, it } from 'vitest'
import { formatCashbackTotals, formatMoney, formatPercent, formatSignedCashback } from './format'

describe('formatMoney', () => {
  it('converts minor units back to a localized currency string', () => {
    // locale-agnostic: this machine's default locale isn't necessarily
    // English, so compare against the same underlying Intl call
    const expected = new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: 'EUR',
    }).format(28.4)
    expect(formatMoney(2840, 'EUR')).toBe(expected)
  })

  it('handles a different currency', () => {
    const expected = new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: 'USD',
    }).format(1)
    expect(formatMoney(100, 'USD')).toBe(expected)
  })
})

describe('formatCashbackTotals', () => {
  it('shows each currency in its own, joined with a plus', () => {
    expect(
      formatCashbackTotals(
        [
          { currency: 'EUR', amountMinor: 81 },
          { currency: 'USD', amountMinor: 41 },
        ],
        'EUR',
      ),
    ).toBe(`${formatMoney(81, 'EUR')} + ${formatMoney(41, 'USD')}`)
    expect(formatCashbackTotals([{ currency: 'USD', amountMinor: 1336 }], 'JPY')).toBe(
      formatMoney(1336, 'USD'),
    )
  })

  it('reads as zero in the given currency when nothing was recorded', () => {
    expect(formatCashbackTotals([], 'JPY')).toBe(formatMoney(0, 'JPY'))
  })
})

describe('formatPercent', () => {
  it('formats a number to 2 decimal places by default', () => {
    expect(formatPercent(2.5)).toBe('2.50%')
  })

  it('respects a custom fraction digit count', () => {
    expect(formatPercent(2.5, 0)).toBe('3%')
  })

  it('renders null as "Unavailable" rather than a misleading 0%', () => {
    expect(formatPercent(null)).toBe('Unavailable')
  })
})

describe('formatSignedCashback', () => {
  // formatMoney's own output, whitespace and all, so this doesn't depend on
  // the locale's spacing around the currency symbol
  it('puts a plus in front of cashback earned', () => {
    expect(formatSignedCashback(31, 'EUR')).toBe(`+${formatMoney(31, 'EUR')}`)
  })

  it('shows cashback taken back by a refund with only its minus sign', () => {
    expect(formatSignedCashback(-270, 'EUR')).toBe(formatMoney(-270, 'EUR'))
    expect(formatSignedCashback(-270, 'EUR')).not.toContain('+')
  })
})
