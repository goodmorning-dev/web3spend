import { Percent, ShoppingBag, TrendingUp } from 'lucide-react'
import type { PeriodSummary } from '@/analyzers'
import { formatMoney, formatPercent } from '@/utils/format'
import KpiCard from './KpiCard'

/** "€1,565.67 settled · €24.50 pending": what's come through, and the
 * part of the total that's still pending, in the same yellow as the
 * transaction list's Pending tags. */
function SettledAndPending({
  settledLabel,
  settledMinor,
  pendingMinor,
  currency,
}: {
  settledLabel: string
  settledMinor: number
  pendingMinor: number
  currency: string
}) {
  return (
    <>
      {formatMoney(settledMinor, currency)} {settledLabel}
      <span aria-hidden="true"> · </span>
      <span className="text-warning">{formatMoney(pendingMinor, currency)} pending</span>
    </>
  )
}

interface KpiRowProps {
  summary: PeriodSummary
  currency: string
}

/** MVP-PLAN §5: spend on cleared and pending purchases, recorded cashback
 * on those purchases, and effective cashback percentage when valid. When
 * anything is pending, the spend and cashback cards split their total into
 * what's settled (or received) and what's still pending. */
function KpiRow({ summary, currency }: KpiRowProps) {
  const purchases = `${summary.purchaseCount} purchase${summary.purchaseCount === 1 ? '' : 's'}`
  const pending = summary.pendingCount > 0 ? `, ${summary.pendingCount} pending` : ''
  const hasPending = summary.pendingCount > 0

  return (
    <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-3">
      <KpiCard
        icon={<ShoppingBag className="size-5" />}
        label="Total spent"
        value={formatMoney(summary.spendMinor, currency)}
        hint={`across ${purchases}${pending}`}
        detail={
          hasPending && (
            <SettledAndPending
              settledLabel="settled"
              settledMinor={summary.spendMinor - summary.pendingSpendMinor}
              pendingMinor={summary.pendingSpendMinor}
              currency={currency}
            />
          )
        }
      />
      <KpiCard
        icon={<TrendingUp className="size-5" />}
        label="Cashback earned"
        value={
          summary.cashbackComplete ? formatMoney(summary.cashbackMinor, currency) : 'Unavailable'
        }
        hint={
          summary.cashbackComplete
            ? 'recorded on these purchases'
            : 'unavailable: some purchases recorded cashback in another currency'
        }
        detail={
          hasPending &&
          summary.cashbackComplete && (
            <SettledAndPending
              settledLabel="received"
              settledMinor={summary.cashbackMinor - summary.pendingCashbackMinor}
              pendingMinor={summary.pendingCashbackMinor}
              currency={currency}
            />
          )
        }
        tone="positive"
      />
      <KpiCard
        icon={<Percent className="size-5" />}
        label="Effective cashback"
        value={formatPercent(summary.effectiveCashbackPct)}
        hint="on these purchases"
      />
    </div>
  )
}

export default KpiRow
