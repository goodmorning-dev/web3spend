import { Percent, ShoppingBag, TrendingUp } from 'lucide-react'
import type { PeriodSummary } from '@/analyzers'
import { formatMoney, formatPercent } from '@/utils/format'
import KpiCard from './KpiCard'

interface KpiRowProps {
  summary: PeriodSummary
  currency: string
}

/** MVP-PLAN §5: spend on cleared and pending purchases, recorded cashback
 * on those purchases, and effective cashback percentage when valid. The
 * spend hint says how many of the purchases are still pending. */
function KpiRow({ summary, currency }: KpiRowProps) {
  const purchases = `${summary.purchaseCount} purchase${summary.purchaseCount === 1 ? '' : 's'}`
  const pending = summary.pendingCount > 0 ? `, ${summary.pendingCount} pending` : ''

  return (
    <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-3">
      <KpiCard
        icon={<ShoppingBag className="size-5" />}
        label="Total spent"
        value={formatMoney(summary.spendMinor, currency)}
        hint={`across ${purchases}${pending}`}
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
