export type TransactionStatus = 'CLEARED' | 'PENDING' | 'CANCELLED' | 'UNKNOWN'

/** How a card purchase was paid for. Borrow Mode rows have exactly the same
 * columns as Direct Pay ones, so both import and count the same way; only
 * this value differs. */
export type SpendingMode = 'Direct Pay' | 'Borrow Mode'

export interface StandardTransaction {
  id: string
  cardId: string
  timestampUtc: string
  type: 'card_spend'
  description: string
  status: TransactionStatus
  amountMinor: number
  currency: string
  originalAmountMinor: number
  originalCurrency: string
  cashbackMinor: number
  cashbackCurrency: string
  categoryRaw: string
  spendingMode: SpendingMode
  identityKey: string
  importId: string
}
