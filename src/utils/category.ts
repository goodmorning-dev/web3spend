// Etherfi's own export mixes categories with and without a leading MCC
// code (e.g. "5411 - Grocery Stores and Supermarkets" alongside plain
// "Grocery Stores and Supermarkets" for what is otherwise the same
// category, seen in practice on PENDING rows). categoryRaw itself keeps
// both forms exactly as imported; these helpers exist so anywhere
// categories are grouped or filtered can still treat the two as one
// category instead of splitting spend across duplicate entries.
const MCC_PREFIX_PATTERN = /^\d{3,4}\s*-\s*/

/** A merge key for grouping/filtering: the category text with any leading
 * MCC code stripped, case-insensitively. */
export function categoryMergeKey(categoryRaw: string): string {
  return categoryRaw.replace(MCC_PREFIX_PATTERN, '').toLowerCase()
}

/** The representative label for a group of raw category strings that share
 * a merge key: the MCC-coded variant when one exists (more specific than
 * the bare description alone), otherwise whichever variant was given. */
export function preferredCategoryLabel(labels: Iterable<string>): string {
  let fallback: string | undefined
  for (const label of labels) {
    if (MCC_PREFIX_PATTERN.test(label)) {
      return label
    }
    fallback ??= label
  }
  return fallback ?? ''
}
