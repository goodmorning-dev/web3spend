import type { TransactionStatus } from '@/types/transaction'

/**
 * CLEARED and CANCELLED are terminal: once a transaction reaches either, later
 * imports never move it back to PENDING/UNKNOWN. ether.fi's export is supposed to
 * be authoritative each time, but nothing stops a narrower or stale re-export
 * from reporting an older status for the same transaction, and TECHNICAL-PLAN §6
 * requires that a stale report can't downgrade what we already trust. A report
 * whose status agrees with the current one (unchanged, or a real transition this
 * rule allows) is still trusted for its other fields (e.g. a cashback amount
 * that posts or gets corrected after a purchase is already CLEARED).
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
