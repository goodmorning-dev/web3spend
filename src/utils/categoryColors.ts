import type { CategoryBucket } from '@/analyzers'

/**
 * One set of category colors for the whole app, so a category looks the
 * same in the dashboard's donut as in every transaction list. Seven
 * distinct colors (gold, purple, green, orange, sky, coral, pink); gray is
 * kept for the donut's "Other" and never used for a named category.
 */
const CATEGORY_COLORS = [
  'var(--color-chart-1)',
  'var(--color-chart-2)',
  'var(--color-chart-3)',
  'var(--color-chart-4)',
  'var(--color-chart-7)',
  'var(--color-chart-6)',
  'var(--color-chart-8)',
]

export const OTHER_CATEGORY_COLOR = 'var(--color-chart-5)'

/** How many categories the donut names before rolling the rest into
 * "Other". */
export const MAX_NAMED_CATEGORIES = 5

/** A small, deterministic hash so the same category name always lands on
 * the same color, without a lookup table for every value real data could
 * contain. */
function hashString(value: string): number {
  let hash = 0
  for (let index = 0; index < value.length; index++) {
    hash = (hash << 5) - hash + value.charCodeAt(index)
    hash |= 0
  }
  return Math.abs(hash)
}

/** The color a category gets when nothing bigger on screen already has it:
 * picked from its name (as shown, without the MCC code), so it stays the
 * same from one month or page to the next. */
export function preferredCategoryColor(label: string): string {
  return CATEGORY_COLORS[hashString(label) % CATEGORY_COLORS.length]
}

/** What identifies a bucket's category: its merge key, or its name for a
 * bucket without one. */
export function categoryIdentity(bucket: Pick<CategoryBucket, 'category' | 'key'>): string {
  return bucket.key ?? bucket.category
}

/**
 * Colors for the categories the donut names, from buckets sorted biggest
 * first (aggregateByCategory): each takes its preferred color unless a
 * bigger category already has it, and then the first one still free, so no
 * two named slices ever match. Keyed by categoryIdentity. Anything not in
 * the map is part of "Other" and shown gray (OTHER_CATEGORY_COLOR).
 */
export function categoryColorMap(buckets: CategoryBucket[]): Map<string, string> {
  const colors = new Map<string, string>()
  const taken = new Set<string>()
  for (const bucket of buckets.slice(0, MAX_NAMED_CATEGORIES)) {
    const preferred = preferredCategoryColor(bucket.category)
    const color = taken.has(preferred)
      ? (CATEGORY_COLORS.find((candidate) => !taken.has(candidate)) ?? preferred)
      : preferred
    taken.add(color)
    colors.set(categoryIdentity(bucket), color)
  }
  return colors
}
