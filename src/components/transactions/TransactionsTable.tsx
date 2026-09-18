import type { StandardTransaction, TransactionStatus } from '@/types/transaction'
import { formatUtcDate } from '@/utils/dates'
import { formatMoney } from '@/utils/format'

interface TransactionsTableProps {
  transactions: StandardTransaction[]
  cardLabelById: Map<string, string>
}

const STATUS_LABELS: Record<TransactionStatus, string> = {
  CLEARED: 'Cleared',
  PENDING: 'Pending',
  CANCELLED: 'Cancelled',
  UNKNOWN: 'Unknown',
}

const STATUS_TONE: Record<TransactionStatus, string> = {
  CLEARED: 'bg-positive/15 text-positive',
  PENDING: 'bg-warning/15 text-warning',
  CANCELLED: 'bg-muted text-text-faint',
  UNKNOWN: 'bg-muted text-text-faint',
}

/** MVP-PLAN §6: a CLEARED row with a negative amount is refund-like and is
 * excluded from every spend/cashback total the analyzers compute (see
 * isEligiblePurchase); it must never read as an ordinary cleared purchase,
 * since that would misrepresent why its amount doesn't show up anywhere
 * else on the dashboard. This is a labeling fix only, not new accounting:
 * the row still isn't netted against anything.
 */
function isRefundLike(transaction: StandardTransaction): boolean {
  return transaction.status === 'CLEARED' && transaction.amountMinor < 0
}

interface StatusDisplay {
  label: string
  tone: string
  hint?: string
}

function describeStatus(transaction: StandardTransaction): StatusDisplay {
  if (isRefundLike(transaction)) {
    return {
      label: 'Refund-like',
      tone: 'bg-warning/15 text-warning',
      hint: 'A negative cleared amount; excluded from spend and cashback totals',
    }
  }
  return { label: STATUS_LABELS[transaction.status], tone: STATUS_TONE[transaction.status] }
}

function StatusPill({ transaction }: { transaction: StandardTransaction }) {
  const { label, tone, hint } = describeStatus(transaction)
  return (
    <span
      title={hint}
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium whitespace-nowrap ${tone}`}
    >
      {label}
    </span>
  )
}

function cardLabel(cardLabelById: Map<string, string>, cardId: string): string {
  return cardLabelById.get(cardId) ?? 'Unknown card'
}

function hasDifferentOriginalAmount(transaction: StandardTransaction): boolean {
  return (
    transaction.originalAmountMinor !== transaction.amountMinor ||
    transaction.originalCurrency !== transaction.currency
  )
}

/** MVP-PLAN §5: "show original amount/currency in details when different."
 * A <details> disclosure keeps every row's normal height while still
 * making the original figure genuinely inspectable, not just present in
 * data no control ever surfaces. */
function OriginalAmountDetails({ transaction }: { transaction: StandardTransaction }) {
  if (!hasDifferentOriginalAmount(transaction)) {
    return null
  }
  return (
    <details className="mt-0.5">
      <summary className="cursor-pointer text-[11px] font-medium text-text-faint select-none">
        Original amount
      </summary>
      <p className="mt-0.5 text-xs text-text-dim tabular-nums">
        {formatMoney(transaction.originalAmountMinor, transaction.originalCurrency)}
      </p>
    </details>
  )
}

/** A plain table on wider screens, a stacked receipt-style list on phone
 * widths where a 7-column table would no longer be legible. */
function TransactionsTable({ transactions, cardLabelById }: TransactionsTableProps) {
  if (transactions.length === 0) {
    return <p className="text-sm text-text-faint">No transactions match your filters.</p>
  }

  return (
    <>
      <ul className="flex flex-col gap-2 sm:hidden">
        {transactions.map((transaction) => (
          <li
            key={transaction.id}
            className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card p-3"
          >
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{transaction.description}</p>
              <p className="truncate text-xs text-text-faint">
                {formatUtcDate(transaction.timestampUtc)} · {transaction.categoryRaw} ·{' '}
                {cardLabel(cardLabelById, transaction.cardId)}
              </p>
              <OriginalAmountDetails transaction={transaction} />
            </div>
            <div className="flex shrink-0 flex-col items-end gap-1">
              <span className="text-sm font-semibold tabular-nums">
                {formatMoney(transaction.amountMinor, transaction.currency)}
              </span>
              <span className="text-xs tabular-nums text-positive">
                {formatMoney(transaction.cashbackMinor, transaction.cashbackCurrency)}
              </span>
              <StatusPill transaction={transaction} />
            </div>
          </li>
        ))}
      </ul>

      <div className="hidden overflow-x-auto sm:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs text-text-faint">
              <th className="py-2 pr-3 font-medium">Date</th>
              <th className="py-2 pr-3 font-medium">Merchant</th>
              <th className="py-2 pr-3 font-medium">Category</th>
              <th className="py-2 pr-3 font-medium">Card</th>
              <th className="py-2 pr-3 text-right font-medium">Amount</th>
              <th className="py-2 pr-3 text-right font-medium">Cashback</th>
              <th className="py-2 text-right font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((transaction) => (
              <tr key={transaction.id} className="border-b border-border/60 last:border-0">
                <td className="py-2 pr-3 whitespace-nowrap text-text-faint">
                  {formatUtcDate(transaction.timestampUtc)}
                </td>
                <td className="py-2 pr-3">{transaction.description}</td>
                <td className="py-2 pr-3 text-text-dim">{transaction.categoryRaw}</td>
                <td className="py-2 pr-3 text-text-dim">
                  {cardLabel(cardLabelById, transaction.cardId)}
                </td>
                <td className="py-2 pr-3 text-right font-medium tabular-nums">
                  {formatMoney(transaction.amountMinor, transaction.currency)}
                  <OriginalAmountDetails transaction={transaction} />
                </td>
                <td className="py-2 pr-3 text-right tabular-nums text-positive">
                  {formatMoney(transaction.cashbackMinor, transaction.cashbackCurrency)}
                </td>
                <td className="py-2 text-right">
                  <StatusPill transaction={transaction} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}

export default TransactionsTable
