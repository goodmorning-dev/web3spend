import { useState } from 'react'
import ImportFlow from '@/components/ImportFlow'
import { useDashboardSummary } from '@/hooks/useDashboardSummary'

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
 * The M1 stand-in for the real Dashboard: enough to prove import, upsert,
 * and restore-on-reopen work end to end. KPIs, charts, the heatmap, and the
 * transaction table land in the rest of Milestone 2 (TECHNICAL-PLAN §13).
 */
function DashboardPage() {
  const summary = useDashboardSummary()
  // Set once a file finishes processing in this component's lifetime, so a
  // first import's result (including any unsupported-row warnings) stays on
  // screen instead of being unmounted the instant `hasData` flips to true.
  const [justImported, setJustImported] = useState(false)

  if (summary === undefined) {
    return <p className="text-sm text-muted-foreground">Loading...</p>
  }

  const hasData = summary.transactionCount > 0

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

      {hasData && (
        <section className="flex flex-col gap-2">
          <h1 className="font-heading text-xl font-semibold">Your data</h1>
          <p className="text-sm text-muted-foreground">
            {summary.transactionCount} transaction{summary.transactionCount === 1 ? '' : 's'}{' '}
            imported.
          </p>
          {summary.earliestTimestampUtc && summary.latestTimestampUtc && (
            <p className="text-sm text-muted-foreground">
              Observed transactions from {formatUtcDate(summary.earliestTimestampUtc)} to{' '}
              {formatUtcDate(summary.latestTimestampUtc)} (UTC).
            </p>
          )}
          {summary.latestImportedAt && (
            <p className="text-sm text-muted-foreground">
              Last import: {formatUtcDate(summary.latestImportedAt)} (UTC).
            </p>
          )}
          <p className="text-xs text-muted-foreground">
            KPIs, charts, and the transaction table are coming soon.
          </p>
        </section>
      )}

      {(!hasData || justImported) && <ImportFlow onImported={() => setJustImported(true)} />}
    </div>
  )
}

export default DashboardPage
