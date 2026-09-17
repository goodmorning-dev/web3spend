export type TransactionStatus = 'CLEARED' | 'PENDING' | 'CANCELLED' | 'UNKNOWN'

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
  spendingMode: 'Direct Pay'
  identityKey: string
  importId: string
}
