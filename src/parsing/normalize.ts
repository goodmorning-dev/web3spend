const NON_BREAKING_SPACE = String.fromCharCode(160)
const WHITESPACE_PATTERN = new RegExp(`[${NON_BREAKING_SPACE}\\s]+`, 'g')
const TIMESTAMP_PATTERN = /^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2}) UTC$/
// Matches a plain decimal (no exponential notation): the shortest string that
// round-trips to the same double, per Number.prototype.toString(). If the
// source value truly had at most 2 decimals, this reproduces it exactly.
const PLAIN_DECIMAL_PATTERN = /^-?\d+(?:\.(\d+))?$/

/**
 * Collapses runs of whitespace, including the non-breaking spaces Etherfi's
 * export sometimes trails category text with, into a single space and trims
 * the ends. Leaves other punctuation alone: an em dash inside category text
 * (e.g. "Digital Goods, Software") is genuine content, not an artifact.
 */
export function normalizeText(raw: string): string {
  return raw.replace(WHITESPACE_PATTERN, ' ').trim()
}

/**
 * Parses Etherfi's "YYYY-MM-DD HH:mm:ss UTC" timestamp format into ISO 8601.
 * Returns null (never guesses) for anything that doesn't match the format or
 * names an invalid calendar date/time (e.g. Feb 30).
 */
export function parseTimestampUtc(raw: string): string | null {
  const match = TIMESTAMP_PATTERN.exec(raw.trim())
  if (!match) {
    return null
  }
  const [year, month, day, hour, minute, second] = match.slice(1).map(Number)
  const date = new Date(Date.UTC(year, month - 1, day, hour, minute, second))
  const isValid =
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day &&
    date.getUTCHours() === hour &&
    date.getUTCMinutes() === minute &&
    date.getUTCSeconds() === second
  return isValid ? date.toISOString() : null
}

/**
 * TECHNICAL-PLAN §8: reject rather than round an amount with more than 2
 * fractional digits, since fiat amounts are always <=2 decimals and a 3rd
 * digit signals something we don't understand yet. Comparing value*100 to
 * its rounded form with a fixed tolerance isn't reliable here: a tolerance
 * loose enough to absorb genuine floating-point noise on large amounts is
 * also loose enough to silently accept a value like 1.000000001 as 100
 * cents. Reading the decimal digits directly off the value's own string
 * form doesn't have that problem, since toString() reproduces exactly the
 * digits the value was constructed from.
 */
export function toAmountMinorOrNull(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return null
  }
  const match = PLAIN_DECIMAL_PATTERN.exec(value.toString())
  if (!match) {
    return null
  }
  const fractionDigits = match[1]?.length ?? 0
  if (fractionDigits > 2) {
    return null
  }
  const minor = Math.round(value * 100)
  return Number.isSafeInteger(minor) ? minor : null
}

/**
 * A card's last four digits are always exactly 4 digits, so a number cell
 * (e.g. Excel auto-detecting "0643" as 643) can be safely zero-padded back
 * rather than treated as ambiguous.
 */
export function toLast4OrNull(value: unknown): string | null {
  const text =
    typeof value === 'string'
      ? value.trim()
      : typeof value === 'number'
        ? String(value).padStart(4, '0')
        : null
  return text && /^\d{4}$/.test(text) ? text : null
}
