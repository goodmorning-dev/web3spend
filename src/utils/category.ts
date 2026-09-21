// Etherfi's own export mixes categories with and without a leading MCC
// code (e.g. "5411 - Grocery Stores and Supermarkets" alongside plain
// "Grocery Stores and Supermarkets" for what is otherwise the same
// category, seen in practice on PENDING rows). categoryRaw itself keeps
// both forms exactly as imported; these helpers exist so anywhere a
// category is grouped, filtered, or displayed can treat the two as one
// category and show the plain description without the code, rather than
// splitting spend across duplicate entries or surfacing a number nobody
// asked to see.
const MCC_PREFIX_PATTERN = /^\d{3,4}\s*-\s*/

/** A merge key for grouping/filtering: the category text with any leading
 * MCC code stripped, case-insensitively. */
export function categoryMergeKey(categoryRaw: string): string {
  return categoryRaw.replace(MCC_PREFIX_PATTERN, '').toLowerCase()
}

/** The category text as shown anywhere in the UI: the leading MCC code, if
 * present, stripped off, case preserved otherwise. */
export function displayCategoryLabel(categoryRaw: string): string {
  return categoryRaw.replace(MCC_PREFIX_PATTERN, '')
}
