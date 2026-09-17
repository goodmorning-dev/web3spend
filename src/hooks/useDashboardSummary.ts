import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/storage/db'

export interface DashboardSummary {
  transactionCount: number
  earliestTimestampUtc: string | null
  latestTimestampUtc: string | null
  latestImportedAt: string | null
}

/**
 * Live so the view updates immediately after a commit, and so reopening the
 * app restores the right state without an extra fetch step (MVP-PLAN §4
 * step 7). A full table scan is fine at this scale; a dedicated analyzers
 * module lands in Milestone 2 once real aggregation is needed.
 */
export function useDashboardSummary(): DashboardSummary | undefined {
  return useLiveQuery(async () => {
    const [transactions, imports] = await Promise.all([
      db.transactions.toArray(),
      db.imports.toArray(),
    ])

    const timestamps = transactions.map((transaction) => transaction.timestampUtc).sort()
    const latestImportedAt = imports.reduce<string | null>(
      (latest, record) =>
        latest === null || record.importedAt > latest ? record.importedAt : latest,
      null,
    )

    return {
      transactionCount: transactions.length,
      earliestTimestampUtc: timestamps[0] ?? null,
      latestTimestampUtc: timestamps[timestamps.length - 1] ?? null,
      latestImportedAt,
    }
  })
}
