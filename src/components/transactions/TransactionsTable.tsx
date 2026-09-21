import type { StandardTransaction, TransactionStatus } from '@/types/transaction'
import { avatarColorFor, categoryColorFor, initialsFor } from '@/utils/avatar'
import { formatUtcDate } from '@/utils/dates'
import { formatMoney, formatSignedCashback, formatSignedSpend } from '@/utils/format'

interface TransactionsTableProps {
  transactions: StandardTransaction[]
  /** cardId -> last4, for the design reference's "•••• 1234" card display. */
  cardLastFourById: Map<string, string>
}

const STATUS_LABELS: Record<TransactionStatus, string> = {
  CLEARED: 'Settled',
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

function StatusPill({
  transaction,
  compact = false,
}: {
  transaction: StandardTransaction
  /** Tighter padding/gap for the mobile row, which has less room to work with. */
  compact?: boolean
}) {
  const { label, tone, hint } = describeStatus(transaction)
  return (
    <span
      title={hint}
      className={`inline-flex items-center rounded-full text-[11px] font-medium whitespace-nowrap ${compact ? 'gap-1 px-2 py-0.5' : 'gap-1.5 px-2.5 py-1'} ${tone}`}
    >
      <span className="size-1.5 shrink-0 rounded-full bg-current" aria-hidden="true" />
      {label}
    </span>
  )
}

function MerchantAvatar({ merchant }: { merchant: string }) {
  return (
    <span
      aria-hidden="true"
      className="flex size-[22px] shrink-0 items-center justify-center rounded-[7px] text-[10px] font-semibold text-white"
      style={{ backgroundColor: avatarColorFor(merchant) }}
    >
      {initialsFor(merchant)}
    </span>
  )
}

function CategoryDot({ category }: { category: string }) {
  return (
    <span
      aria-hidden="true"
      className="inline-block size-[7px] shrink-0 rounded-[2px]"
      style={{ backgroundColor: categoryColorFor(category) }}
    />
  )
}

function cardDisplay(cardLastFourById: Map<string, string>, cardId: string): string {
  const lastFour = cardLastFourById.get(cardId)
  return lastFour ? `•••• ${lastFour}` : 'Unknown card'
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
function TransactionsTable({ transactions, cardLastFourById }: TransactionsTableProps) {
  if (transactions.length === 0) {
    return <p className="text-sm text-text-faint">No transactions match your filters.</p>
  }

  return (
    <>
      <ul className="flex flex-col gap-2 sm:hidden">
        {transactions.map((transaction) => (
          <li
            key={transaction.id}
            className="flex flex-col gap-1.5 rounded-xl border border-border bg-card p-3"
          >
            <div className="flex items-center gap-2.5">
              <MerchantAvatar merchant={transaction.description} />
              <p className="min-w-0 flex-1 truncate text-sm font-medium">
                {transaction.description}
              </p>
              <span className="shrink-0 text-sm font-semibold tabular-nums">
                {formatSignedSpend(transaction.amountMinor, transaction.currency)}
              </span>
            </div>
            <div className="flex items-center justify-between gap-1.5">
              <span className="min-w-0 truncate text-xs text-text-faint">
                {formatUtcDate(transaction.timestampUtc)}
              </span>
              <div className="flex shrink-0 items-center gap-1.5">
                <span className="text-xs tabular-nums text-positive">
                  {formatSignedCashback(transaction.cashbackMinor, transaction.cashbackCurrency)}
                </span>
                <StatusPill transaction={transaction} compact />
              </div>
            </div>
            <div className="flex items-center justify-between gap-1.5">
              <p className="flex min-w-0 items-center gap-1 text-xs text-text-faint">
                <CategoryDot category={transaction.categoryRaw} />
                <span className="min-w-0 truncate">{transaction.categoryRaw}</span>
              </p>
              <span className="shrink-0 whitespace-nowrap text-xs text-text-faint">
                {cardDisplay(cardLastFourById, transaction.cardId)}
              </span>
            </div>
            <OriginalAmountDetails transaction={transaction} />
          </li>
        ))}
      </ul>

      <div className="hidden overflow-x-auto sm:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs text-text-faint">
              <th className="py-2 pr-3 text-[10px] font-semibold tracking-[0.06em] uppercase">
                Date
              </th>
              <th className="py-2 pr-3 text-[10px] font-semibold tracking-[0.06em] uppercase">
                Merchant
              </th>
              <th className="py-2 pr-3 text-[10px] font-semibold tracking-[0.06em] uppercase">
                Category
              </th>
              <th className="py-2 pr-3 text-[10px] font-semibold tracking-[0.06em] uppercase">
                Card
              </th>
              <th className="py-2 pr-3 text-right text-[10px] font-semibold tracking-[0.06em] uppercase">
                Amount
              </th>
              <th className="py-2 pr-3 text-right text-[10px] font-semibold tracking-[0.06em] uppercase">
                Cashback
              </th>
              <th className="py-2 text-right text-[10px] font-semibold tracking-[0.06em] uppercase">
                Status
              </th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((transaction) => (
              <tr key={transaction.id} className="border-b border-border/60 last:border-0">
                <td className="py-2 pr-3 whitespace-nowrap text-text-faint">
                  {formatUtcDate(transaction.timestampUtc)}
                </td>
                <td className="py-2 pr-3">
                  <div className="flex items-center gap-2.5">
                    <MerchantAvatar merchant={transaction.description} />
                    {transaction.description}
                  </div>
                </td>
                <td className="py-2 pr-3 text-text-dim">
                  <span className="inline-flex items-center gap-1.5">
                    <CategoryDot category={transaction.categoryRaw} />
                    {transaction.categoryRaw}
                  </span>
                </td>
                <td className="py-2 pr-3 text-text-dim">
                  {cardDisplay(cardLastFourById, transaction.cardId)}
                </td>
                <td className="py-2 pr-3 text-right font-medium tabular-nums">
                  {formatSignedSpend(transaction.amountMinor, transaction.currency)}
                  <OriginalAmountDetails transaction={transaction} />
                </td>
                <td className="py-2 pr-3 text-right tabular-nums text-positive">
                  {formatSignedCashback(transaction.cashbackMinor, transaction.cashbackCurrency)}
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
