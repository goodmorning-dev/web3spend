import type { ParsedTransactionRow } from '@/matching/commitImport'

export interface UnsupportedRow {
  rowNumber: number
  reason: string
}

export interface ParseResult {
  rows: ParsedTransactionRow[]
  unsupported: UnsupportedRow[]
}

/**
 * TECHNICAL-PLAN §2: isolate provider-specific parsing behind this interface.
 * Only `etherfi` implements it in the MVP, but the seam stays free for a v2
 * second provider.
 */
export interface ProviderAdapter {
  parse(data: ArrayBuffer): ParseResult
}
