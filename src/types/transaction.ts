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
  /** 'manual' for a transaction the person added themselves. Absent on
   * imported ones, which is every row stored before manual entry existed. */
  source?: 'manual'
  /** One of the person's own categories (CustomCategory.id), chosen for
   * this transaction specifically. Takes priority over any category rule.
   * ORIGINAL_CATEGORY_ID pins the transaction to categoryRaw even when a
   * rule would otherwise move it. */
  categoryId?: string
  /** Fields of an imported transaction the person has changed. A later
   * import leaves these alone instead of overwriting them. */
  editedFields?: EditableField[]
  /** What the import last reported for each edited field, so the edit can
   * be undone (and stays current if a newer import reports something new).
   * An edited cashback amount keeps its currency with it, so cashbackCurrency
   * is recorded here alongside cashbackMinor. */
  importedValues?: Partial<Pick<StandardTransaction, EditableField | 'cashbackCurrency'>>
}

/** Fields a person can change on an imported transaction. Card and
 * currency stay fixed: they're part of what identifies the purchase. */
export const EDITABLE_FIELDS = [
  'timestampUtc',
  'description',
  'amountMinor',
  'originalAmountMinor',
  'cashbackMinor',
  'status',
  'spendingMode',
] as const

export type EditableField = (typeof EDITABLE_FIELDS)[number]

/** See StandardTransaction.categoryId. */
export const ORIGINAL_CATEGORY_ID = 'original'
