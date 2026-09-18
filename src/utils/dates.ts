/**
 * UTC-safe date helpers. MVP-PLAN §6: monthly/yearly grouping is UTC-based
 * for reproducibility, regardless of the viewer's local timezone.
 */

export function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0
}

export function daysInUtcMonth(year: number, month: number): number {
  // day 0 of the next month is the last day of this one
  return new Date(Date.UTC(year, month, 0)).getUTCDate()
}

export function daysInUtcYear(year: number): number {
  return isLeapYear(year) ? 366 : 365
}

export function formatUtcDateKey(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

export function formatUtcMonthKey(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, '0')}`
}

export function getUtcYear(timestampUtc: string): number {
  return new Date(timestampUtc).getUTCFullYear()
}

export function getUtcMonth(timestampUtc: string): number {
  return new Date(timestampUtc).getUTCMonth() + 1
}

export function getUtcDateKey(timestampUtc: string): string {
  const date = new Date(timestampUtc)
  return formatUtcDateKey(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate())
}

/** e.g. "September 2026". Explicit timeZone: 'UTC' so a viewer ahead of UTC
 * never sees a month label shifted by the local/UTC boundary. */
export function formatUtcMonthLabel(year: number, month: number): string {
  return new Date(Date.UTC(year, month - 1, 1)).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    timeZone: 'UTC',
  })
}
