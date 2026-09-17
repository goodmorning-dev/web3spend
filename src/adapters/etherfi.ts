import { read, utils } from 'xlsx'
import { detectHeaderRowIndex, TRANSACTION_SHEET_NAME } from '@/parsing/header'
import { parseRow } from '@/parsing/rowParser'
import type { ParseResult, ProviderAdapter, UnsupportedRow } from './providerAdapter'

/**
 * TECHNICAL-PLAN §5: reads only the "All Transactions" sheet by exact name
 * (never the per-currency sheets, which duplicate its rows), detects the
 * header by column name, and validates/normalizes every data row.
 */
function parse(data: ArrayBuffer): ParseResult {
  const workbook = read(data, { type: 'array' })
  const sheet = workbook.Sheets[TRANSACTION_SHEET_NAME]
  if (!sheet) {
    throw new Error(`Workbook has no "${TRANSACTION_SHEET_NAME}" sheet.`)
  }

  const headerRowIndex = detectHeaderRowIndex(sheet)
  if (headerRowIndex === null) {
    throw new Error('Could not find the transaction header row.')
  }

  const rawRows = utils.sheet_to_json<Record<string, unknown>>(sheet, {
    range: headerRowIndex,
    raw: true,
    defval: null,
  })

  const rows: ParseResult['rows'] = []
  const unsupported: UnsupportedRow[] = []

  rawRows.forEach((raw, index) => {
    const result = parseRow(raw)
    if (result.ok) {
      rows.push(result.row)
    } else {
      // +2: 1 to move from a 0-based header index to a 1-based spreadsheet
      // row, +1 more because data starts on the row after the header.
      unsupported.push({ rowNumber: headerRowIndex + 2 + index, reason: result.reason })
    }
  })

  return { rows, unsupported }
}

export const etherfiAdapter: ProviderAdapter = { parse }
