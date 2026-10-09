/** A category the person made themselves, as opposed to the merchant
 * category ether.fi reports on each card purchase. */
export interface CustomCategory {
  id: string
  name: string
  createdAt: string
  /** A color the person picked (see CATEGORY_COLOR_CHOICES). Without one,
   * the category gets a color from its name like any other. */
  color?: string
}

/**
 * "Always file this under one of my categories": either every purchase
 * from one merchant, or everything ether.fi puts under one of its own
 * categories. matchKey is what's compared (see merchantKey and
 * categoryMergeKey); label is what the rule matched, as shown to the
 * person.
 */
export interface CategoryRule {
  id: string
  kind: 'merchant' | 'category'
  matchKey: string
  label: string
  categoryId: string
}
