import type { StandardTransaction } from '@/types/transaction'

export interface CashbackTotal {
  currency: string
  amountMinor: number
  /** The part of `amountMinor` recorded on purchases still pending. */
  pendingMinor: number
}

/**
 * Adds a purchase's cashback to the running total for the currency it was
 * recorded in. ether.fi records the cashback on a purchase made in another
 * currency in USD (a purchase in yen earns dollars), and the export has no
 * exchange rate to convert it with, so each currency keeps its own total.
 */
export function addCashback(
  totals: Map<string, CashbackTotal>,
  transaction: StandardTransaction,
): void {
  const total = totals.get(transaction.cashbackCurrency) ?? {
    currency: transaction.cashbackCurrency,
    amountMinor: 0,
    pendingMinor: 0,
  }
  total.amountMinor += transaction.cashbackMinor
  if (transaction.status === 'PENDING') {
    total.pendingMinor += transaction.cashbackMinor
  }
  totals.set(transaction.cashbackCurrency, total)
}

/**
 * The totals as a list: the purchases' own currency first, then the rest
 * alphabetically, leaving out a currency whose cashback came to nothing.
 * Empty when no cashback was recorded at all.
 */
export function listCashbackTotals(
  totals: Map<string, CashbackTotal>,
  spendCurrency: string | undefined,
): CashbackTotal[] {
  return [...totals.values()]
    .filter((total) => total.amountMinor !== 0)
    .sort((a, b) => {
      if (a.currency === spendCurrency) {
        return -1
      }
      if (b.currency === spendCurrency) {
        return 1
      }
      return a.currency.localeCompare(b.currency)
    })
}
