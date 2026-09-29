import { Percent, ShoppingBag, TrendingUp } from 'lucide-react'
import type { PeriodSummary } from '@/analyzers'
import { formatCashbackTotals, formatMoney, formatPercent } from '@/utils/format'
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

/** "USD", "JPY and USD", "EUR, JPY and USD". */
function listCurrencies(codes: string[]): string {
  return codes.length <= 1
    ? (codes[0] ?? '')
    : `${codes.slice(0, -1).join(', ')} and ${codes[codes.length - 1]}`
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
  // ether.fi records the cashback on a purchase in another currency in USD,
  // so a view of yen purchases can have its cashback in dollars. It's shown
  // in the currency it was recorded in; without an exchange rate in the
  // export, it can't go into the effective rate.
  const cashbackCurrencies = summary.cashbackByCurrency.map((total) => total.currency)
  const otherCashbackCurrencies = cashbackCurrencies.filter((code) => code !== currency)
  // The received/pending split needs all of the cashback in one currency.
  const cashbackForSplit = summary.cashbackComplete
    ? { currency, amountMinor: summary.cashbackMinor, pendingMinor: summary.pendingCashbackMinor }
    : summary.cashbackByCurrency.length === 1
      ? summary.cashbackByCurrency[0]
      : null

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
        value={formatCashbackTotals(summary.cashbackByCurrency, currency)}
        hint={
          otherCashbackCurrencies.length > 0
            ? `recorded on these purchases, in ${listCurrencies(cashbackCurrencies)}`
            : 'recorded on these purchases'
        }
        detail={
          hasPending &&
          cashbackForSplit && (
            <SettledAndPending
              settledLabel="received"
              settledMinor={cashbackForSplit.amountMinor - cashbackForSplit.pendingMinor}
              pendingMinor={cashbackForSplit.pendingMinor}
              currency={cashbackForSplit.currency}
            />
          )
        }
        tone="positive"
      />
      <KpiCard
        icon={<Percent className="size-5" />}
        label="Effective cashback"
        value={formatPercent(summary.effectiveCashbackPct)}
        hint={
          summary.cashbackComplete
            ? 'on these purchases'
            : otherCashbackCurrencies.length > 0
              ? `the export has no exchange rate to compare ${listCurrencies(otherCashbackCurrencies)} cashback with ${currency} spending`
              : 'unavailable: some purchases recorded cashback in another currency'
        }
        detail={
          !summary.cashbackComplete &&
          otherCashbackCurrencies.length > 0 &&
          `${summary.cashbackMinor !== 0 ? 'Some cashback' : 'Cashback'} is in ${listCurrencies(otherCashbackCurrencies)}, spending in ${currency}`
        }
      />
    </div>
  )
}

export default KpiRow
