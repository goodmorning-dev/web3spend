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

const EXPECTED_COLUMNS_SET: ReadonlySet<string> = new Set(EXPECTED_COLUMNS)

export interface ResolvedHeader {
  rowIndex: number
  columns: (string | null)[]
}

export type HeaderResolution = { ok: true; header: ResolvedHeader } | { ok: false; reason: string }

/**
 * Scans every row for the header, matched by column name rather than a fixed
 * row index: real exports have a summary block above the actual table. Never
 * guesses: a row with a duplicated required column, or more than one row
 * that looks like a valid header, is reported as an error rather than
 * silently resolved by picking the first match (MVP-PLAN section 4).
 */
export function resolveHeader(sheet: WorkSheet): HeaderResolution {
  const rawRows = utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    range: 0,
    raw: true,
    defval: null,
  })

  const candidates: ResolvedHeader[] = []

  for (let rowIndex = 0; rowIndex < rawRows.length; rowIndex++) {
    const columns = rawRows[rowIndex].map((cell) => (typeof cell === 'string' ? cell.trim() : null))
    const names = new Set(columns.filter((cell): cell is string => cell !== null))
    if (!EXPECTED_COLUMNS.every((name) => names.has(name))) {
      continue
    }

    const duplicate = findDuplicateExpectedColumn(columns)
    if (duplicate) {
      return {
        ok: false,
        reason: `Row ${rowIndex + 1} has more than one "${duplicate}" column; expected exactly one.`,
      }
    }

    candidates.push({ rowIndex, columns })
  }

  if (candidates.length === 0) {
    return { ok: false, reason: 'Could not find the transaction header row.' }
  }
  if (candidates.length > 1) {
    const rowNumbers = candidates.map((candidate) => candidate.rowIndex + 1).join(', ')
    return {
      ok: false,
      reason: `Found more than one possible header row (rows ${rowNumbers}); expected exactly one transaction table.`,
    }
  }
  return { ok: true, header: candidates[0] }
}

function findDuplicateExpectedColumn(columns: (string | null)[]): string | null {
  const seen = new Set<string>()
  for (const name of columns) {
    if (name === null || !EXPECTED_COLUMNS_SET.has(name)) {
      continue
    }
    if (seen.has(name)) {
      return name
    }
    seen.add(name)
  }
  return null
}
