import { describe, expect, it } from 'vitest'
import type { CategoryBucket } from '@/analyzers'
import {
  categoryColorMap,
  isCategoryColor,
  listCategoryColor,
  MAX_NAMED_CATEGORIES,
  preferredCategoryColor,
} from './categoryColors'

function bucket(category: string, spendMinor: number): CategoryBucket {
  return { category, key: category.toLowerCase(), spendMinor, share: 0 }
}

describe('categoryColorMap with colors the person picked', () => {
  it('uses a picked color, and keeps every other category off it', () => {
    const groceries = bucket('Groceries', 500)
    const picked = preferredCategoryColor('Groceries')
    // "Gaming" picks the color Groceries would otherwise have had
    const colors = categoryColorMap(
      [groceries, bucket('Gaming', 100)],
      new Map([['gaming', picked]]),
    )

    expect(colors.get('gaming')).toBe(picked)
    expect(colors.get('groceries')).not.toBe(picked)
  })

  it('includes a picked color even for a category the donut rolls into Other', () => {
    const buckets = Array.from({ length: MAX_NAMED_CATEGORIES }, (_, index) =>
      bucket(`Category ${index}`, 900 - index),
    )
    buckets.push(bucket('Gaming', 1))
    const colors = categoryColorMap(buckets, new Map([['gaming', '#123456']]))

    expect(colors.get('gaming')).toBe('#123456')
    // so the transaction list shows it too
    expect(listCategoryColor('Gaming', 'gaming', colors)).toBe('#123456')
  })

  it('ignores a picked color for a category that is not on screen', () => {
    const colors = categoryColorMap([bucket('Groceries', 500)], new Map([['gaming', '#123456']]))
    expect(colors.has('gaming')).toBe(false)
  })
})

describe('isCategoryColor', () => {
  it('accepts the offered colors and plain hex colors', () => {
    expect(isCategoryColor('var(--color-chart-1)')).toBe(true)
    expect(isCategoryColor('#A3e635')).toBe(true)
  })

  it('refuses anything else, so no stray CSS can end up in a style', () => {
    expect(isCategoryColor('red')).toBe(false)
    expect(isCategoryColor('#fff')).toBe(false)
    expect(isCategoryColor('var(--anything)')).toBe(false)
    expect(isCategoryColor('#123456; background: url(x)')).toBe(false)
  })
})
