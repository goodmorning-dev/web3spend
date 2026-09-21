/** A small, deterministic hash so the same category string always gets the
 * same color on every render, without needing a lookup table for every
 * value real transaction data could contain. */
function hashString(value: string): number {
  let hash = 0
  for (let index = 0; index < value.length; index++) {
    hash = (hash << 5) - hash + value.charCodeAt(index)
    hash |= 0
  }
  return Math.abs(hash)
}

// The bright chart palette works well for a small dot: there's no text
// sitting on top of it to worry about contrast for.
const CATEGORY_DOT_COLORS = [
  'var(--color-chart-1)',
  'var(--color-chart-2)',
  'var(--color-chart-3)',
  'var(--color-chart-4)',
  'var(--color-chart-5)',
  'var(--color-destructive)',
  'var(--color-positive)',
]

export function categoryColorFor(category: string): string {
  return CATEGORY_DOT_COLORS[hashString(category) % CATEGORY_DOT_COLORS.length]
}
