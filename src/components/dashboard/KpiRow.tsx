import { Percent, ShoppingBag, TrendingUp } from 'lucide-react'
import type { PeriodSummary } from '@/analyzers'
import { formatMoney, formatPercent } from '@/utils/format'
import KpiCard from './KpiCard'

interface KpiRowProps {
  summary: PeriodSummary
  currency: string
}

/** MVP-PLAN §5: cleared purchase spend, recorded cashback on those purchases,
 * and effective cashback percentage when valid. */
function KpiRow({ summary, currency }: KpiRowProps) {
  return (
    <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-3">
      <KpiCard
        icon={<ShoppingBag className="size-5" />}
        label="Total spent"
        value={formatMoney(summary.clearedSpendMinor, currency)}
        hint={`across ${summary.clearedCount} cleared purchase${summary.clearedCount === 1 ? '' : 's'}`}
      />
      <KpiCard
        icon={<TrendingUp className="size-5" />}
        label="Cashback earned"
        value={formatMoney(summary.clearedCashbackMinor, currency)}
        hint="recorded on cleared purchases"
        tone="positive"
      />
      <KpiCard
        icon={<Percent className="size-5" />}
        label="Effective cashback"
        value={formatPercent(summary.effectiveCashbackPct)}
        hint="on cleared purchases"
      />
    </div>
  )
}

export default KpiRow
