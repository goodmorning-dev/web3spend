import { utils, type WorkSheet } from 'xlsx'

export const TRANSACTION_SHEET_NAME = 'All Transactions'

export const EXPECTED_COLUMNS = [
  'timestamp',
  'type',
  'description',
  'status',
  'amount',
  'currency',
  'card',
  'card holder name',
  'original amount',
  'original currency',
  'cashback earned',
  'cashback currency',
  'category',
  'spending mode',
] as const

const HEADER_SCAN_LIMIT = 15

/**
 * Scans the first rows for the header, matched by column name rather than a
 * fixed row index: real exports have a summary block above the actual table.
 * Returns null (never guesses) if no row within the scan window has all the
 * expected column names.
 */
export function detectHeaderRowIndex(sheet: WorkSheet): number | null {
  const rawRows = utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    range: 0,
    raw: true,
    defval: null,
  })

  for (let i = 0; i < Math.min(HEADER_SCAN_LIMIT, rawRows.length); i++) {
    const cellNames = new Set(
      rawRows[i]
        .filter((cell): cell is string => typeof cell === 'string')
        .map((cell) => cell.trim()),
    )
    if (EXPECTED_COLUMNS.every((name) => cellNames.has(name))) {
      return i
    }
  }
  return null
}
