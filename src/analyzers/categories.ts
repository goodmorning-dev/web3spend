import type { StandardTransaction } from '@/types/transaction'
import { categoryMergeKey, displayCategoryLabel } from '@/utils/category'
import { assertSingleCurrency } from './assertSingleCurrency'
import { isEligiblePurchase } from './eligibility'

export interface CategoryBucket {
  /** Etherfi's own category text, an MCC-coded and bare variant of the
   * same category merged together and shown without the code (see
   * categoryMergeKey / displayCategoryLabel). */
  category: string
  spendMinor: number
  /** 0-1, this category's share of total cleared spend across all categories. */
  share: number
}

/**
 * MVP-PLAN §5: sorted (descending) spend by category with amount and share,
 * from cleared purchases only (a refund-like negative-amount row is
 * excluded, per MVP-PLAN §6, not counted as negative spend in its category).
 */
export function aggregateByCategory(transactions: StandardTransaction[]): CategoryBucket[] {
  assertSingleCurrency(transactions)

  const totalsByKey = new Map<string, { label: string; spendMinor: number }>()
  for (const transaction of transactions) {
    if (!isEligiblePurchase(transaction)) {
      continue
    }
    const key = categoryMergeKey(transaction.categoryRaw)
    const bucket = totalsByKey.get(key) ?? {
      label: displayCategoryLabel(transaction.categoryRaw),
      spendMinor: 0,
    }
    bucket.spendMinor += transaction.amountMinor
    totalsByKey.set(key, bucket)
  }

  const totalSpendMinor = [...totalsByKey.values()].reduce((sum, { spendMinor }) => sum + spendMinor, 0)

  return [...totalsByKey.values()]
    .map(({ label, spendMinor }) => ({
      category: label,
      spendMinor,
      share: totalSpendMinor > 0 ? spendMinor / totalSpendMinor : 0,
    }))
    .sort((a, b) => b.spendMinor - a.spendMinor)
}
