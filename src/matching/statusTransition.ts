import type { TransactionStatus } from '@/types/transaction'

/**
 * CLEARED and CANCELLED are terminal: once a transaction reaches either, later
 * imports never move it back to PENDING/UNKNOWN. Etherfi's export is supposed to
 * be authoritative each time, but nothing stops a narrower or stale re-export
 * from reporting an older status for the same transaction, and TECHNICAL-PLAN §6
 * requires that a stale report can't downgrade what we already trust.
 *
 * A terminal transaction is locked entirely, not just on status: a stale report
 * that gets its status rejected also carries a stale cashback figure (e.g. an
 * older export's 0 cashback for a purchase that has since posted 12 cents), so
 * callers should treat the whole row as untouched when isTerminalStatus is true.
 */
const TERMINAL_STATUSES: ReadonlySet<TransactionStatus> = new Set(['CLEARED', 'CANCELLED'])

export function isTerminalStatus(status: TransactionStatus): boolean {
  return TERMINAL_STATUSES.has(status)
}

export function resolveStatusTransition(
  existingStatus: TransactionStatus,
  reportedStatus: TransactionStatus,
): TransactionStatus {
  if (isTerminalStatus(existingStatus)) {
    return existingStatus
  }
  return reportedStatus
}
