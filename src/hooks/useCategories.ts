import { useLiveQuery } from 'dexie-react-hooks'
import { buildCategoryLookup, type CategoryLookup } from '@/categorization/customCategories'
import { listCategories, listCategoryRules } from '@/storage/categories'
import { db } from '@/storage/db'
import type { CategoryRule, CustomCategory } from '@/types/category'
import { categoryMergeKey, displayCategoryLabel } from '@/utils/category'
import { useDataSource } from './useDataSource'

export interface CategoriesState {
  categories: CustomCategory[]
  rules: CategoryRule[]
  lookup: CategoryLookup
  /** ether.fi's own categories found in the data, as shown (no MCC code),
   * one per category however many spellings it comes in. */
  etherfiCategories: string[]
}

/** The person's categories and rules, live, so the edit form and the
 * settings list both update the moment either changes. */
export function useCategories(): CategoriesState | undefined {
  const source = useDataSource()
  return useLiveQuery(async () => {
    const [categories, rules, transactions] = await Promise.all([
      listCategories(),
      listCategoryRules(),
      db.transactions.toArray(),
    ])
    const labelByKey = new Map<string, string>()
    for (const transaction of transactions) {
      labelByKey.set(
        categoryMergeKey(transaction.categoryRaw),
        displayCategoryLabel(transaction.categoryRaw),
      )
    }
    return {
      categories,
      rules,
      lookup: buildCategoryLookup(categories, rules),
      etherfiCategories: [...labelByKey.values()].sort((a, b) => a.localeCompare(b)),
    }
  }, [source])
}
