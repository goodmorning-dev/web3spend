import type { CategoryRule, CustomCategory } from '@/types/category'
import { ORIGINAL_CATEGORY_ID, type StandardTransaction } from '@/types/transaction'
import { categoryMergeKey } from '@/utils/category'

/** What a merchant rule matches on: the description, case-insensitively,
 * with its whitespace tidied the same way imports already tidy it. */
export function merchantKey(description: string): string {
  return description.replace(/\s+/g, ' ').trim().toLowerCase()
}

export type CategorySource = 'transaction' | 'merchant-rule' | 'category-rule' | 'original'

export interface ResolvedCategory {
  /** The category to show and group by. */
  label: string
  /** The custom category it came from, if any. */
  categoryId?: string
  source: CategorySource
}

export interface CategoryLookup {
  categoriesById: Map<string, CustomCategory>
  merchantRules: Map<string, CategoryRule>
  categoryRules: Map<string, CategoryRule>
}

export function buildCategoryLookup(
  categories: CustomCategory[],
  rules: CategoryRule[],
): CategoryLookup {
  const categoriesById = new Map(categories.map((category) => [category.id, category]))
  const merchantRules = new Map<string, CategoryRule>()
  const categoryRules = new Map<string, CategoryRule>()
  for (const rule of rules) {
    // A rule left pointing at a category that no longer exists is ignored
    // rather than shown as a blank name.
    if (!categoriesById.has(rule.categoryId)) {
      continue
    }
    ;(rule.kind === 'merchant' ? merchantRules : categoryRules).set(rule.matchKey, rule)
  }
  return { categoriesById, merchantRules, categoryRules }
}

/**
 * The category a transaction counts under. Most specific wins: a category
 * picked for this one transaction, then a rule for its merchant, then a
 * rule for ether.fi's category, and finally ether.fi's category itself.
 */
export function resolveCategory(
  transaction: Pick<StandardTransaction, 'categoryId' | 'categoryRaw' | 'description'>,
  lookup: CategoryLookup,
): ResolvedCategory {
  const original: ResolvedCategory = { label: transaction.categoryRaw, source: 'original' }

  if (transaction.categoryId === ORIGINAL_CATEGORY_ID) {
    return original
  }
  const picked = transaction.categoryId && lookup.categoriesById.get(transaction.categoryId)
  if (picked) {
    return { label: picked.name, categoryId: picked.id, source: 'transaction' }
  }

  const rules: [CategoryRule | undefined, CategorySource][] = [
    [lookup.merchantRules.get(merchantKey(transaction.description)), 'merchant-rule'],
    [lookup.categoryRules.get(categoryMergeKey(transaction.categoryRaw)), 'category-rule'],
  ]
  for (const [rule, source] of rules) {
    const category = rule && lookup.categoriesById.get(rule.categoryId)
    if (category) {
      return { label: category.name, categoryId: category.id, source }
    }
  }
  return original
}

/**
 * Every transaction as the rest of the app should see it: categoryRaw
 * replaced by the category it resolves to, so the dashboard, filters and
 * lists all group by the person's own categories without each needing to
 * know they exist.
 */
export function applyCustomCategories(
  transactions: StandardTransaction[],
  categories: CustomCategory[],
  rules: CategoryRule[],
): StandardTransaction[] {
  if (categories.length === 0) {
    return transactions
  }
  const lookup = buildCategoryLookup(categories, rules)
  return transactions.map((transaction) => {
    const { label } = resolveCategory(transaction, lookup)
    return label === transaction.categoryRaw ? transaction : { ...transaction, categoryRaw: label }
  })
}
