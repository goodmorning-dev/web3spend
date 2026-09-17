import type { TransactionStatus } from '@/types/transaction'

/**
 * CLEARED and CANCELLED are terminal: once a transaction reaches either, later
 * imports never move it back to PENDING/UNKNOWN. Etherfi's export is supposed to
 * be authoritative each time, but nothing stops a narrower or stale re-export
 * from reporting an older status for the same transaction, and TECHNICAL-PLAN §6
 * requires that a stale report can't downgrade what we already trust.
 */
const TERMINAL_STATUSES: ReadonlySet<TransactionStatus> = new Set(['CLEARED', 'CANCELLED'])

export function resolveStatusTransition(
  existingStatus: TransactionStatus,
  reportedStatus: TransactionStatus,
): TransactionStatus {
  if (TERMINAL_STATUSES.has(existingStatus)) {
    return existingStatus
  }
  return reportedStatus
}
