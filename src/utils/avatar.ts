/** A small, deterministic hash so the same merchant or category string
 * always gets the same color and initials on every render, without needing
 * a lookup table for every value real transaction data could contain. */
function hashString(value: string): number {
  let hash = 0
  for (let index = 0; index < value.length; index++) {
    hash = (hash << 5) - hash + value.charCodeAt(index)
    hash |= 0
  }
  return Math.abs(hash)
}

// Muted, dark tones so a merchant avatar's white initials stay readable on
// any of them, matching the design reference's own avatar palette.
const AVATAR_COLORS = [
  '#1c1c1c',
  '#111827',
  '#065f46',
  '#166534',
  '#7c2d12',
  '#7f1d1d',
  '#292524',
  '#0c4a6e',
  '#713f12',
  '#1e293b',
  '#854d0e',
]

export function avatarColorFor(merchant: string): string {
  return AVATAR_COLORS[hashString(merchant) % AVATAR_COLORS.length]
}

/** Up to 2 characters: the first letter of each of the first two words, or
 * the first two characters of a single-word name. */
export function initialsFor(merchant: string): string {
  const words = merchant.trim().split(/\s+/).filter(Boolean)
  if (words.length === 0) {
    return '?'
  }
  if (words.length === 1) {
    return words[0].slice(0, 2).toUpperCase()
  }
  return (words[0][0] + words[1][0]).toUpperCase()
}

// The bright chart palette works well for a small dot: unlike the avatar,
// there's no white text sitting on top of it to worry about contrast for.
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
