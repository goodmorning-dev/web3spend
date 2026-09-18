import type { StandardTransaction } from '@/types/transaction'
import { assertSingleCurrency } from './assertSingleCurrency'
import { isEligiblePurchase } from './eligibility'

export interface CategoryBucket {
  /** Etherfi's own raw category text; the MVP does not map it to a taxonomy. */
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

  const totalsByCategory = new Map<string, number>()
  for (const transaction of transactions) {
    if (!isEligiblePurchase(transaction)) {
      continue
    }
    totalsByCategory.set(
      transaction.categoryRaw,
      (totalsByCategory.get(transaction.categoryRaw) ?? 0) + transaction.amountMinor,
    )
  }

  const totalSpendMinor = [...totalsByCategory.values()].reduce((sum, value) => sum + value, 0)

  return [...totalsByCategory.entries()]
    .map(([category, spendMinor]) => ({
      category,
      spendMinor,
      share: totalSpendMinor > 0 ? spendMinor / totalSpendMinor : 0,
    }))
    .sort((a, b) => b.spendMinor - a.spendMinor)
}
