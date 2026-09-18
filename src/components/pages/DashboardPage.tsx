import { useState } from 'react'
import { summarizeTransactions } from '@/analyzers'
import ImportFlow from '@/components/ImportFlow'
import KpiRow from '@/components/dashboard/KpiRow'
import { useDashboardFilters } from '@/hooks/DashboardFiltersContext'
import { useDashboardSummary } from '@/hooks/useDashboardSummary'
import { useFilteredTransactions } from '@/hooks/useFilteredTransactions'

/**
 * MVP-PLAN §6: source timestamps and their explicit UTC timezone are
 * preserved and labeled, never reinterpreted in the viewer's local zone. A
 * purchase at Jan 31 23:30 UTC must read as Jan 31, not Feb 1 for a viewer
 * ahead of UTC.
 */
function formatUtcDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  })
}

/**
 * The charts, heatmap, and transaction table land in the rest of Milestone 2
 * (TECHNICAL-PLAN §13); the KPI row already reflects the shared
 * currency/card/period filters (MVP-PLAN §5).
 */
function DashboardPage() {
  const overallSummary = useDashboardSummary()
  const { filters } = useDashboardFilters()
  const filteredTransactions = useFilteredTransactions(filters)
  // Set once a file finishes processing in this component's lifetime, so a
  // first import's result (including any unsupported-row warnings) stays on
  // screen instead of being unmounted the instant `hasData` flips to true.
  const [justImported, setJustImported] = useState(false)

  if (overallSummary === undefined) {
    return <p className="text-sm text-muted-foreground">Loading...</p>
  }

  const hasData = overallSummary.transactionCount > 0

  if (hasData && !justImported && (!filters || filteredTransactions === undefined)) {
    return <p className="text-sm text-muted-foreground">Loading...</p>
  }

  return (
    <div className="flex flex-col gap-6">
      {!hasData && (
        <section className="flex flex-col gap-2">
          <h1 className="font-heading text-xl font-semibold">Import your Etherfi export</h1>
          <p className="text-sm text-muted-foreground">
            Select the XLSX file Etherfi gives you when you export your transaction history. It is
            read entirely in this browser; nothing is uploaded anywhere.
          </p>
        </section>
      )}

      {hasData && filters && filteredTransactions !== undefined && (
        <div className="flex flex-col gap-4">
          <KpiRow
            summary={summarizeTransactions(filteredTransactions)}
            currency={filters.currency}
          />
          <p className="text-xs text-text-faint">
            {overallSummary.latestImportedAt && (
              <>Last import: {formatUtcDate(overallSummary.latestImportedAt)} (UTC). </>
            )}
            Charts, the activity heatmap, and the transaction table are coming soon.
          </p>
        </div>
      )}

      {(!hasData || justImported) && <ImportFlow onImported={() => setJustImported(true)} />}
    </div>
  )
}

export default DashboardPage
