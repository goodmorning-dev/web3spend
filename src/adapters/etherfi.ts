import { read, utils } from 'xlsx'
import { resolveHeader, TRANSACTION_SHEET_NAME } from '@/parsing/header'
import { parseRow } from '@/parsing/rowParser'
import type { ParseResult, ProviderAdapter, UnsupportedRow } from './providerAdapter'

/**
 * Bumped whenever parsing/normalization behavior changes, so an ImportRecord
 * can tell which parser version actually produced its rows.
 */
export const ETHERFI_PARSER_VERSION = '1'

/**
 * TECHNICAL-PLAN §5: reads only the "All Transactions" sheet by exact name
 * (never the per-currency sheets, which duplicate its rows), resolves the
 * header, and validates/normalizes every data row using that same header's
 * own column names, so a row never gets mapped against different keys than
 * the ones detection actually validated.
 */
function parse(data: ArrayBuffer): ParseResult {
  const workbook = read(data, { type: 'array' })
  const sheet = workbook.Sheets[TRANSACTION_SHEET_NAME]
  if (!sheet) {
    throw new Error(`Workbook has no "${TRANSACTION_SHEET_NAME}" sheet.`)
  }

  const headerResolution = resolveHeader(sheet)
  if (!headerResolution.ok) {
    throw new Error(headerResolution.reason)
  }
  const { rowIndex: headerRowIndex, columns } = headerResolution.header

  // header: 1 (array rows, not header-keyed objects) and an explicit
  // blankrows: true keep every row's array index aligned to its real
  // spreadsheet position; SheetJS omits blank rows by default in the mode
  // this used to use, which threw off reported row numbers.
  const dataRows = utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    range: headerRowIndex + 1,
    raw: true,
    defval: null,
    blankrows: true,
  })

  const rows: ParseResult['rows'] = []
  const unsupported: UnsupportedRow[] = []

  dataRows.forEach((cells, index) => {
    if (cells.every((cell) => cell === null)) {
      return
    }

    const raw: Record<string, unknown> = {}
    columns.forEach((name, columnIndex) => {
      if (name !== null) {
        raw[name] = cells[columnIndex] ?? null
      }
    })

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
