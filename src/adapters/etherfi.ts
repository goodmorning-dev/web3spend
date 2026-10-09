import { read, utils, type WorkSheet } from 'xlsx'
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
 *
 * ether.fi's CSV export is that same table on its own (same columns, same
 * rows, no summary block), so it goes through the exact same path once it's
 * been read into a sheet.
 */
function parse(data: ArrayBuffer): ParseResult {
  const sheet = isZip(data) ? readTransactionSheet(data) : readCsvSheet(data)

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
    } else if ('reason' in result) {
      // +2: 1 to move from a 0-based header index to a 1-based spreadsheet
      // row, +1 more because data starts on the row after the header.
      unsupported.push({ rowNumber: headerRowIndex + 2 + index, reason: result.reason })
    }
  })

  return { rows, unsupported }
}

function readTransactionSheet(data: ArrayBuffer): WorkSheet {
  const workbook = read(data, { type: 'array' })
  const sheet = workbook.Sheets[TRANSACTION_SHEET_NAME]
  if (!sheet) {
    throw new Error(`Workbook has no "${TRANSACTION_SHEET_NAME}" sheet.`)
  }
  return sheet
}

/**
 * Decoded as UTF-8 here rather than handed to SheetJS as bytes, which would
 * read a BOM-less file as Latin-1 and garble any non-ASCII merchant name.
 * raw: true keeps every cell as the exact text in the file: left to itself,
 * SheetJS would turn the card's "0520" into 520 and try to read the
 * timestamps as dates.
 */
function readCsvSheet(data: ArrayBuffer): WorkSheet {
  const text = new TextDecoder('utf-8').decode(data)
  const workbook = read(text, { type: 'string', raw: true })
  return workbook.Sheets[workbook.SheetNames[0]]
}

/** XLSX files are zip archives, which always start with the bytes "PK" 03 04. */
function isZip(data: ArrayBuffer): boolean {
  const bytes = new Uint8Array(data, 0, Math.min(4, data.byteLength))
  return (
    bytes.length === 4 &&
    bytes[0] === 0x50 &&
    bytes[1] === 0x4b &&
    bytes[2] === 0x03 &&
    bytes[3] === 0x04
  )
}

export const etherfiAdapter: ProviderAdapter = { parse }
