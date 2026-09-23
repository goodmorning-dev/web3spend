import { describe, expect, it } from 'vitest'
import { formatUtcMonthLabel, formatUtcShortMonthLabel } from '@/utils/dates'
import { parsePeriodValue, periodOptions, periodValue } from './periodOptions'

describe('periodOptions', () => {
  it('offers "All time", then only the months that have transactions, even across years', () => {
    const options = periodOptions([
      { year: 2026, month: 1 },
      { year: 2025, month: 12 },
    ])

    expect(options).toEqual([
      { value: 'all', label: 'All time' },
      { value: 'month:2026-1', label: formatUtcMonthLabel(2026, 1) },
      { value: 'month:2025-12', label: formatUtcMonthLabel(2025, 12) },
    ])
  })

  it('uses short month names when asked, for the phone layout', () => {
    expect(periodOptions([{ year: 2026, month: 9 }], { short: true })).toEqual([
      { value: 'all', label: 'All time' },
      { value: 'month:2026-9', label: formatUtcShortMonthLabel(2026, 9) },
    ])
  })
})

describe('periodValue and parsePeriodValue', () => {
  it('round-trip both kinds of period', () => {
    for (const period of [
      { kind: 'all' as const },
      { kind: 'month' as const, year: 2026, month: 9 },
    ]) {
      expect(parsePeriodValue(periodValue(period))).toEqual(period)
    }
  })

  it('shows the month for a picked day, since the select lists months, not days', () => {
    expect(periodValue({ kind: 'month', year: 2026, month: 9, day: 17 })).toBe('month:2026-9')
  })
})
