import { describe, expect, it } from 'vitest'
import { categoryMergeKey, displayCategoryLabel } from './category'

describe('categoryMergeKey', () => {
  it('strips a leading MCC code, case-insensitively', () => {
    expect(categoryMergeKey('5411 - Grocery Stores and Supermarkets')).toBe(
      'grocery stores and supermarkets',
    )
    expect(categoryMergeKey('Grocery Stores and Supermarkets')).toBe(
      'grocery stores and supermarkets',
    )
  })

  it('leaves a category with no MCC prefix as its own key, lowercased', () => {
    expect(categoryMergeKey('Bakeries')).toBe('bakeries')
  })

  it('does not treat a longer number (real MCC codes are 3-4 digits) as a code prefix', () => {
    expect(categoryMergeKey('12345 - Some Category')).toBe('12345 - some category')
  })
})

describe('displayCategoryLabel', () => {
  it('strips a leading MCC code for display, preserving case', () => {
    expect(displayCategoryLabel('5411 - Grocery Stores and Supermarkets')).toBe(
      'Grocery Stores and Supermarkets',
    )
  })

  it('leaves a category with no MCC prefix unchanged', () => {
    expect(displayCategoryLabel('Bakeries')).toBe('Bakeries')
  })
})
