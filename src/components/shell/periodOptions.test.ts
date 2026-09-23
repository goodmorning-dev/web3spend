import { describe, expect, it } from 'vitest'
import { formatUtcMonthLabel } from '@/utils/dates'
import { parsePeriodValue, periodOptions, periodValue } from './periodOptions'

describe('periodOptions', () => {
  it('offers "All time" and each month, without year entries when everything is in one year', () => {
    const options = periodOptions([
      { year: 2026, month: 9 },
      { year: 2026, month: 8 },
    ])

    expect(options).toEqual([
      { value: 'all', label: 'All time' },
      { value: 'month:2026-9', label: formatUtcMonthLabel(2026, 9) },
      { value: 'month:2026-8', label: formatUtcMonthLabel(2026, 8) },
    ])
  })

  it('adds a whole-year entry per year once the data spans more than one', () => {
    const options = periodOptions([
      { year: 2026, month: 1 },
      { year: 2025, month: 12 },
    ])

    expect(options.map((option) => option.label).slice(0, 3)).toEqual([
      'All time',
      'All of 2026',
      'All of 2025',
    ])
  })
})

describe('periodValue and parsePeriodValue', () => {
  it('round-trip every kind of period', () => {
    for (const period of [
      { kind: 'all' as const },
      { kind: 'year' as const, year: 2025 },
      { kind: 'month' as const, year: 2026, month: 9 },
    ]) {
      expect(parsePeriodValue(periodValue(period))).toEqual(period)
    }
  })

  it('shows the month for a picked day, since the select lists months, not days', () => {
    expect(periodValue({ kind: 'month', year: 2026, month: 9, day: 17 })).toBe('month:2026-9')
  })
})
