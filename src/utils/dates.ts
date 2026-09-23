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

export function getUtcDay(timestampUtc: string): number {
  return new Date(timestampUtc).getUTCDate()
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

/** e.g. "Sep 2026", for tighter spots than formatUtcMonthLabel fits. */
export function formatUtcShortMonthLabel(year: number, month: number): string {
  return new Date(Date.UTC(year, month - 1, 1)).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  })
}

/**
 * MVP-PLAN §6: source timestamps and their explicit UTC timezone are
 * preserved and labeled, never reinterpreted in the viewer's local zone. A
 * purchase at Jan 31 23:30 UTC must read as Jan 31, not Feb 1 for a viewer
 * ahead of UTC.
 */
export function formatUtcDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  })
}

/** Same date, plus hour/minute/second, for a hover title on a row that
 * otherwise only shows the day. Every timestamp this app stores already
 * includes a time of day (see parseTimestampUtc), but this stays a
 * separate function from formatUtcDate rather than the row's default
 * display, since a full timestamp is more detail than most glances need. */
export function formatUtcDateTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    timeZone: 'UTC',
    timeZoneName: 'short',
  })
}
