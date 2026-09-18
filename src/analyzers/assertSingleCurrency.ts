import type { StandardTransaction } from '@/types/transaction'

/**
 * MVP-PLAN §6: never total EUR and USD directly. Every analyzer in this
 * module assumes its input is already filtered to one currency; this catches
 * a caller bug (forgetting that filter) instead of silently producing a
 * wrong number.
 */
export function assertSingleCurrency(transactions: StandardTransaction[]): void {
  const currencies = new Set(transactions.map((transaction) => transaction.currency))
  if (currencies.size > 1) {
    throw new Error(
      `Expected transactions already filtered to one currency, got: ${[...currencies].sort().join(', ')}`,
    )
  }
}
