import { describe, expect, it } from 'vitest'
import { formatMoney, formatPercent } from './format'

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
