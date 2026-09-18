import { Calendar, Coins, CreditCard, ShieldCheck, Upload } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { useDashboardFilters } from '@/hooks/DashboardFiltersContext'
import { formatUtcMonthLabel } from '@/utils/dates'
import FilterSelect from './FilterSelect'

const PAGE_TITLES: Record<string, string> = {
  '/app': 'Dashboard',
  '/app/transactions': 'Transactions',
  '/app/import': 'Import',
}

/**
 * MVP-PLAN §5: the card/currency/period controls here apply consistently to
 * every summary, chart, and transaction list under /app. They're hidden
 * (rather than shown disabled) until there's data to filter, since an empty
 * set of options isn't a meaningful choice.
 */
function Topbar() {
  const location = useLocation()
  const { filters, options, setCurrency, setCardId, setPeriod } = useDashboardFilters()
  const title = PAGE_TITLES[location.pathname] ?? 'Dashboard'

  return (
    <header className="flex flex-wrap items-center justify-between gap-3.5">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="font-heading text-lg font-bold">{title}</h2>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-positive/15 px-2.5 py-1 text-xs font-semibold text-positive">
          <ShieldCheck className="size-3" />
          Processed on your device
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-2.5">
        {filters && options && (
          <>
            <FilterSelect
              ariaLabel="Card"
              icon={<CreditCard className="size-3.5 text-text-faint" />}
              value={filters.cardId ?? 'all'}
              onChange={(value) => setCardId(value === 'all' ? undefined : value)}
              options={[
                { value: 'all', label: 'All cards' },
                ...options.cards.map((card) => ({ value: card.id, label: card.label })),
              ]}
            />
            <FilterSelect
              ariaLabel="Currency"
              icon={<Coins className="size-3.5 text-text-faint" />}
              value={filters.currency}
              onChange={setCurrency}
              options={options.currencies.map((currency) => ({
                value: currency,
                label: currency,
              }))}
            />
            <FilterSelect
              ariaLabel="Period"
              icon={<Calendar className="size-3.5 text-text-faint" />}
              value={`${filters.year}-${filters.month}`}
              onChange={(value) => {
                const [year, month] = value.split('-').map(Number)
                setPeriod(year, month)
              }}
              options={options.periods.map((period) => ({
                value: `${period.year}-${period.month}`,
                label: formatUtcMonthLabel(period.year, period.month),
              }))}
            />
          </>
        )}

        <Button asChild size="sm">
          <Link to="/app/import">
            <Upload className="size-3.5" />
            Import transactions
          </Link>
        </Button>
      </div>
    </header>
  )
}

export default Topbar
