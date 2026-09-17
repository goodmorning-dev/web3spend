import { useDashboardSummary } from '@/hooks/useDashboardSummary'
import ImportFlow from './ImportFlow'

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
 * and restore-on-reopen work end to end. Charts, filters, and the
 * transaction table are Milestone 2 (TECHNICAL-PLAN §13).
 */
function Dashboard() {
  const summary = useDashboardSummary()

  if (summary === undefined) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background text-foreground">
        <p className="text-sm text-muted-foreground">Loading...</p>
      </main>
    )
  }

  const hasData = summary.transactionCount > 0

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex max-w-2xl flex-col gap-8 px-6 py-16">
        {hasData ? (
          <section className="flex flex-col gap-2">
            <h1 className="text-2xl font-semibold">Your data</h1>
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
            <p className="text-xs text-muted-foreground">Charts and filtering are coming soon.</p>
          </section>
        ) : (
          <section className="flex flex-col gap-2">
            <h1 className="text-2xl font-semibold">Import your Etherfi export</h1>
            <p className="text-sm text-muted-foreground">
              Select the XLSX file Etherfi gives you when you export your transaction history. It is
              read entirely in this browser; nothing is uploaded anywhere.
            </p>
          </section>
        )}

        <ImportFlow />
      </div>
    </main>
  )
}

export default Dashboard
