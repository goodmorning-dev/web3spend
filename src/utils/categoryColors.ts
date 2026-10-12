import type { CategoryBucket } from '@/analyzers'
import type { CustomCategory } from '@/types/category'

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
 * A category's color in a transaction list, given the donut's colors for
 * the same filters (categoryColorMap): a category the donut names gets the
 * same color there, and any other one keeps its own preferred color, unless
 * a named category is already showing that color, in which case it takes
 * one of the colors the donut isn't using. That way a color the donut uses
 * for a category never shows up on a different one in the list.
 */
export function listCategoryColor(
  label: string,
  key: string,
  namedColors: Map<string, string>,
): string {
  const named = namedColors.get(key)
  if (named) {
    return named
  }
  const used = new Set(namedColors.values())
  const preferred = preferredCategoryColor(label)
  if (!used.has(preferred)) {
    return preferred
  }
  const free = CATEGORY_COLORS.filter((color) => !used.has(color))
  return free.length > 0 ? free[hashString(label) % free.length] : preferred
}

/**
 * Colors for the categories the donut names, from buckets sorted biggest
 * first (aggregateByCategory): each takes its preferred color unless a
 * bigger category already has it, and then the first one still free, so no
 * two named slices ever match. Keyed by categoryIdentity. Anything not in
 * the map is part of the donut's "Other", which the donut shows gray
 * (OTHER_CATEGORY_COLOR); transaction lists color those categories with
 * listCategoryColor instead.
 *
 * `chosen` holds the colors of the person's own categories (see
 * ownCategoryColors), keyed by merge key. Those always win, wherever the
 * category ranks, and every other category steers clear of them, so one of
 * their colors never shows up on a different category too. They're
 * included in the map even for a category the donut rolls into "Other", so
 * transaction lists use them.
 */
export function categoryColorMap(
  buckets: CategoryBucket[],
  chosen: ReadonlyMap<string, string> = new Map(),
): Map<string, string> {
  const colors = new Map<string, string>()
  const taken = new Set<string>()
  for (const bucket of buckets) {
    const color = chosen.get(categoryIdentity(bucket))
    if (color) {
      colors.set(categoryIdentity(bucket), color)
      taken.add(color)
    }
  }
  for (const bucket of buckets.slice(0, MAX_NAMED_CATEGORIES)) {
    if (colors.has(categoryIdentity(bucket))) {
      continue
    }
    const preferred = preferredCategoryColor(bucket.category)
    const color = taken.has(preferred)
      ? (CATEGORY_COLORS.find((candidate) => !taken.has(candidate)) ?? preferred)
      : preferred
    taken.add(color)
    colors.set(categoryIdentity(bucket), color)
  }
  return colors
}

/**
 * The colors offered for a person's own categories: the app's own category
 * colors first, then a few more that still sit well on the dark theme.
 * Any other color has to be a plain #rrggbb value (see isCategoryColor).
 */
export const CATEGORY_COLOR_CHOICES: readonly { value: string; label: string }[] = [
  { value: 'var(--color-chart-1)', label: 'Gold' },
  { value: 'var(--color-chart-4)', label: 'Amber' },
  { value: '#fb923c', label: 'Orange' },
  { value: 'var(--color-chart-6)', label: 'Coral' },
  { value: 'var(--color-chart-8)', label: 'Pink' },
  { value: '#a78bfa', label: 'Violet' },
  { value: 'var(--color-chart-2)', label: 'Periwinkle' },
  { value: 'var(--color-chart-7)', label: 'Sky' },
  { value: '#2dd4bf', label: 'Teal' },
  { value: 'var(--color-chart-3)', label: 'Green' },
  { value: '#a3e635', label: 'Lime' },
  { value: '#94a3b8', label: 'Slate' },
]

/** The colors an automatic color can fall back to when the name's own
 * color is taken: the offered ones, minus slate, which reads as the donut's
 * gray "Other". */
const AUTOMATIC_FALLBACK_COLORS = CATEGORY_COLOR_CHOICES.map((choice) => choice.value).filter(
  (value) => value !== '#94a3b8',
)

/**
 * One fixed color for each of the person's own categories, keyed by
 * category id: the one they picked, or otherwise an automatic one. The
 * automatic color starts from the name (preferredCategoryColor) and skips
 * any color another of their categories already has, oldest category
 * first, so adding a category never recolors an older one. It depends only
 * on their categories, never on what's on screen, so Settings, the
 * dashboard and every transaction list agree on it.
 */
export function ownCategoryColors(categories: readonly CustomCategory[]): Map<string, string> {
  const colors = new Map<string, string>()
  const taken = new Set<string>()
  for (const category of categories) {
    if (category.color) {
      colors.set(category.id, category.color)
      taken.add(category.color)
    }
  }
  const automatic = categories
    .filter((category) => !category.color)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id))
  for (const category of automatic) {
    const preferred = preferredCategoryColor(category.name)
    const color = taken.has(preferred)
      ? (AUTOMATIC_FALLBACK_COLORS.find((candidate) => !taken.has(candidate)) ?? preferred)
      : preferred
    colors.set(category.id, color)
    taken.add(color)
  }
  return colors
}

const HEX_COLOR_PATTERN = /^#[0-9a-f]{6}$/i

/** Whether a value is safe to store and use as a category color: one of
 * the offered choices, or a plain hex color, and never arbitrary CSS. */
export function isCategoryColor(value: string): boolean {
  return (
    HEX_COLOR_PATTERN.test(value) || CATEGORY_COLOR_CHOICES.some((choice) => choice.value === value)
  )
}
