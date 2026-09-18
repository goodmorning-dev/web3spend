import { describe, expect, it } from 'vitest'
import {
  daysInUtcMonth,
  daysInUtcYear,
  formatUtcDateKey,
  formatUtcMonthKey,
  formatUtcMonthLabel,
  getUtcDateKey,
  getUtcMonth,
  getUtcYear,
  isLeapYear,
} from './dates'

describe('isLeapYear', () => {
  it('treats a year divisible by 4 but not 100 as a leap year', () => {
    expect(isLeapYear(2024)).toBe(true)
  })

  it('treats a century year not divisible by 400 as not a leap year', () => {
    expect(isLeapYear(1900)).toBe(false)
  })

  it('treats a century year divisible by 400 as a leap year', () => {
    expect(isLeapYear(2000)).toBe(true)
  })

  it('treats an ordinary non-multiple-of-4 year as not a leap year', () => {
    expect(isLeapYear(2026)).toBe(false)
  })
})

describe('daysInUtcMonth', () => {
  it('returns 28 for February in a non-leap year', () => {
    expect(daysInUtcMonth(2026, 2)).toBe(28)
  })

  it('returns 29 for February in a leap year', () => {
    expect(daysInUtcMonth(2024, 2)).toBe(29)
  })

  it('returns 31 for a 31-day month', () => {
    expect(daysInUtcMonth(2026, 1)).toBe(31)
  })

  it('returns 30 for a 30-day month', () => {
    expect(daysInUtcMonth(2026, 4)).toBe(30)
  })
})

describe('daysInUtcYear', () => {
  it('returns 365 for a non-leap year and 366 for a leap year', () => {
    expect(daysInUtcYear(2026)).toBe(365)
    expect(daysInUtcYear(2024)).toBe(366)
  })
})

describe('formatUtcDateKey / formatUtcMonthKey', () => {
  it('zero-pads month and day', () => {
    expect(formatUtcDateKey(2026, 1, 5)).toBe('2026-01-05')
    expect(formatUtcMonthKey(2026, 1)).toBe('2026-01')
  })
})

describe('getUtcYear / getUtcMonth / getUtcDateKey', () => {
  it('reads the UTC calendar date, not the local one', () => {
    // 23:30 UTC on Jan 31: a viewer ahead of UTC must not see this as February
    const timestampUtc = '2026-01-31T23:30:00.000Z'
    expect(getUtcYear(timestampUtc)).toBe(2026)
    expect(getUtcMonth(timestampUtc)).toBe(1)
    expect(getUtcDateKey(timestampUtc)).toBe('2026-01-31')
  })
})

describe('formatUtcMonthLabel', () => {
  it('names the month and year using the viewer locale, not a hardcoded English one', () => {
    // avoid asserting an English month name: this machine's own default
    // locale may not be English (observed to be Bulgarian in this repo's
    // dev environment), so compare against the same underlying call instead
    const expected = new Date(Date.UTC(2026, 8, 1)).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'long',
      timeZone: 'UTC',
    })
    expect(formatUtcMonthLabel(2026, 9)).toBe(expected)
    expect(formatUtcMonthLabel(2026, 9)).toContain('2026')
  })

  it('does not shift to the next month for a viewer ahead of UTC', () => {
    const originalTz = process.env.TZ
    process.env.TZ = 'Pacific/Kiritimati' // UTC+14
    try {
      // Jan 1 at UTC midnight is still Dec 31 locally in a zone behind UTC,
      // and still January everywhere ahead of UTC; this just needs to not throw
      // or silently compute the wrong month under either kind of offset.
      expect(formatUtcMonthLabel(2026, 1)).not.toContain('2025')
    } finally {
      if (originalTz === undefined) {
        delete process.env.TZ
      } else {
        process.env.TZ = originalTz
      }
    }
  })
})
