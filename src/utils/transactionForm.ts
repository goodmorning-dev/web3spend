import { parseTimestampUtc, toAmountMinorOrNull } from '@/parsing/normalize'

/**
 * Reads an amount typed into a form into minor units, accepting either a
 * dot or a comma as the decimal separator ("12.50", "12,5"). Anything that
 * isn't a plain amount with at most two decimals is rejected, never
 * rounded, the same rule imports follow.
 */
export function parseMoneyInput(text: string): number | null {
  const cleaned = text.trim().replace(/\s/g, '').replace(',', '.')
  return cleaned === '' ? null : toAmountMinorOrNull(cleaned)
}

/** The other way round, for filling a form: 1250 becomes "12.50". Done
 * with integer arithmetic so no floating-point rounding is involved. */
export function formatMoneyInput(amountMinor: number): string {
  const sign = amountMinor < 0 ? '-' : ''
  const absolute = Math.abs(amountMinor)
  return `${sign}${Math.floor(absolute / 100)}.${String(absolute % 100).padStart(2, '0')}`
}

/** A UTC timestamp split into the values a date and a time input take. */
export function splitUtcTimestamp(timestampUtc: string): { date: string; time: string } {
  return { date: timestampUtc.slice(0, 10), time: timestampUtc.slice(11, 16) }
}

/** The other way round. Null for anything that isn't a real date and
 * time. The whole app shows times in UTC, so the inputs are read as UTC
 * too. */
export function joinUtcTimestamp(date: string, time: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time)) {
    return null
  }
  return parseTimestampUtc(`${date} ${time}:00 UTC`)
}
