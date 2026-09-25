import { describe, expect, it } from 'vitest'
import type { CategoryBucket } from '@/analyzers'
import {
  categoryColorMap,
  MAX_NAMED_CATEGORIES,
  OTHER_CATEGORY_COLOR,
  preferredCategoryColor,
} from './categoryColors'

function bucket(category: string, spendMinor: number): CategoryBucket {
  return { category, key: category.toLowerCase(), spendMinor, share: 0 }
}

/** Two category names whose preferred colors are the same. */
function collidingNames(): [string, string] {
  const byColor = new Map<string, string>()
  for (let index = 0; ; index++) {
    const name = `Category ${index}`
    const color = preferredCategoryColor(name)
    const earlier = byColor.get(color)
    if (earlier) {
      return [earlier, name]
    }
    byColor.set(color, name)
  }
}

describe('preferredCategoryColor', () => {
  it('always gives the same category the same color', () => {
    expect(preferredCategoryColor('Grocery Stores and Supermarkets')).toBe(
      preferredCategoryColor('Grocery Stores and Supermarkets'),
    )
  })

  it('keeps Electronics Stores coral, as it was in the transaction lists', () => {
    expect(preferredCategoryColor('Electronics Stores')).toBe('var(--color-chart-6)')
  })

  it('never hands out the gray kept for "Other"', () => {
    for (let index = 0; index < 50; index++) {
      expect(preferredCategoryColor(`Category ${index}`)).not.toBe(OTHER_CATEGORY_COLOR)
    }
  })
})

describe('categoryColorMap', () => {
  it('colors only the categories the donut names, each differently', () => {
    const buckets = Array.from({ length: 8 }, (_, index) =>
      bucket(`Category ${index}`, 800 - index),
    )

    const colors = categoryColorMap(buckets)

    expect([...colors.keys()]).toEqual(
      buckets.slice(0, MAX_NAMED_CATEGORIES).map((named) => named.key),
    )
    expect(new Set(colors.values()).size).toBe(MAX_NAMED_CATEGORIES)
    expect([...colors.values()]).not.toContain(OTHER_CATEGORY_COLOR)
  })

  it('lets the bigger category keep its color when two would match', () => {
    const [bigger, smaller] = collidingNames()

    const colors = categoryColorMap([bucket(bigger, 500), bucket(smaller, 100)])

    expect(colors.get(bigger.toLowerCase())).toBe(preferredCategoryColor(bigger))
    expect(colors.get(smaller.toLowerCase())).not.toBe(preferredCategoryColor(bigger))
  })
})
