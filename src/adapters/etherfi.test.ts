import { utils, write, type WorkBook } from 'xlsx'
import { describe, expect, it } from 'vitest'
import { etherfiAdapter } from './etherfi'

const NBSP = String.fromCharCode(160)

const HEADER_ROW = [
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
]

/**
 * Entirely made-up data shaped like the real export (summary block above the
 * header, per-currency decoy sheet, mixed statuses, an MCC-prefixed and a
 * non-prefixed category, one with a trailing non-breaking space, a blank row,
 * and one unsupported row). Never the real anonymized file, which never
 * leaves web3spend-mvp/ and is never read by anything under test.
 */
function buildWorkbook(): WorkBook {
  const allTransactionsRows = [
    ['Transaction Summary'],
    [],
    ['Period', '2026-01-01 00:00:00 UTC - 2026-02-01 00:00:00 UTC'],
    ['Total Transactions', 4],
    ['Total Amount (EUR)', '57.70'],
    [],
    [],
    HEADER_ROW,
    [
      '2026-01-15 10:00:00 UTC',
      'card_spend',
      'Merchant Coffee',
      'CLEARED',
      4.5,
      'EUR',
      '1234',
      'Jane Doe',
      4.5,
      'EUR',
      0.14,
      'EUR',
      '5411 - Grocery Stores and Supermarkets',
      'Direct Pay',
    ],
    [
      '2026-01-16 11:00:00 UTC',
      'card_spend',
      'Merchant Bakery',
      'PENDING',
      3.2,
      'EUR',
      '1234',
      'Jane Doe',
      3.2,
      'EUR',
      0.1,
      'EUR',
      'Bakeries',
      'Direct Pay',
    ],
    [
      '2026-01-17 12:00:00 UTC',
      'card_spend',
      'Merchant Fuel',
      'CANCELLED',
      40,
      'EUR',
      '1234',
      'Jane Doe',
      40,
      'EUR',
      1.2,
      'EUR',
      `Service Stations${NBSP}`,
      'Direct Pay',
    ],
    [],
    [
      '2026-01-18 09:00:00 UTC',
      'card_spend',
      'Merchant Unknown',
      'REVERSED',
      10,
      'EUR',
      '1234',
      'Jane Doe',
      10,
      'EUR',
      0.3,
      'EUR',
      'Miscellaneous',
      'Direct Pay',
    ],
  ]

  const decoySheetRows = [
    ['Transaction Summary'],
    [],
    HEADER_ROW,
    [
      '1999-01-01 00:00:00 UTC',
      'card_spend',
      'Should never be read',
      'CLEARED',
      1,
      'EUR',
      '0000',
      'Nobody',
      1,
      'EUR',
      0,
      'EUR',
      'Decoy',
      'Direct Pay',
    ],
  ]

  const workbook = utils.book_new()
  utils.book_append_sheet(workbook, utils.aoa_to_sheet(allTransactionsRows), 'All Transactions')
  utils.book_append_sheet(workbook, utils.aoa_to_sheet(decoySheetRows), 'USD Card Transactions')
  return workbook
}

function toArrayBuffer(workbook: WorkBook): ArrayBuffer {
  return write(workbook, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer
}

describe('etherfiAdapter', () => {
  it('parses only the "All Transactions" sheet, skipping the summary block and decoy sheets', () => {
    const { rows, unsupported } = etherfiAdapter.parse(toArrayBuffer(buildWorkbook()))

    expect(rows).toHaveLength(3)
    expect(unsupported).toHaveLength(1)
    expect(rows.every((row) => row.last4 === '1234')).toBe(true)
    expect(rows.some((row) => row.description === 'Should never be read')).toBe(false)
  })

  it('normalizes a trailing non-breaking space out of category text without touching an MCC prefix', () => {
    const { rows } = etherfiAdapter.parse(toArrayBuffer(buildWorkbook()))

    const fuel = rows.find((row) => row.description === 'Merchant Fuel')
    expect(fuel?.categoryRaw).toBe('Service Stations')

    const coffee = rows.find((row) => row.description === 'Merchant Coffee')
    expect(coffee?.categoryRaw).toBe('5411 - Grocery Stores and Supermarkets')
  })

  it('reports the unsupported row with its actual spreadsheet row number, unthrown off by the blank row before it', () => {
    const { unsupported } = etherfiAdapter.parse(toArrayBuffer(buildWorkbook()))

    // spreadsheet row 13, not 12: SheetJS omits blank rows by default in the
    // mode used to build data rows, which would otherwise shift every row
    // number after a blank row back by one.
    expect(unsupported).toEqual([{ rowNumber: 13, reason: 'Unsupported status: REVERSED' }])
  })

  it('throws a clear error when the "All Transactions" sheet is missing', () => {
    const workbook = utils.book_new()
    utils.book_append_sheet(workbook, utils.aoa_to_sheet([['nothing here']]), 'Some Other Sheet')

    expect(() => etherfiAdapter.parse(toArrayBuffer(workbook))).toThrow(/All Transactions/)
  })

  it('throws a clear error when no header row can be found', () => {
    const workbook = utils.book_new()
    utils.book_append_sheet(
      workbook,
      utils.aoa_to_sheet([['not', 'a', 'header', 'row']]),
      'All Transactions',
    )

    expect(() => etherfiAdapter.parse(toArrayBuffer(workbook))).toThrow(/header row/)
  })

  it('throws instead of silently reading only the first of two duplicated columns', () => {
    const workbook = utils.book_new()
    const headerWithDuplicateAmount = [...HEADER_ROW, 'amount']
    utils.book_append_sheet(
      workbook,
      utils.aoa_to_sheet([headerWithDuplicateAmount]),
      'All Transactions',
    )

    expect(() => etherfiAdapter.parse(toArrayBuffer(workbook))).toThrow(/more than one "amount"/)
  })

  it('throws instead of silently importing rows from two separate tables in the same sheet', () => {
    const workbook = utils.book_new()
    utils.book_append_sheet(
      workbook,
      utils.aoa_to_sheet([
        HEADER_ROW,
        [
          '2026-01-15 10:00:00 UTC',
          'card_spend',
          'Merchant A',
          'CLEARED',
          1,
          'EUR',
          '1234',
          'Jane Doe',
          1,
          'EUR',
          0,
          'EUR',
          'Category A',
          'Direct Pay',
        ],
        [],
        HEADER_ROW,
        [
          '2026-02-15 10:00:00 UTC',
          'card_spend',
          'Merchant B',
          'CLEARED',
          2,
          'EUR',
          '1234',
          'Jane Doe',
          2,
          'EUR',
          0,
          'EUR',
          'Category B',
          'Direct Pay',
        ],
      ]),
      'All Transactions',
    )

    expect(() => etherfiAdapter.parse(toArrayBuffer(workbook))).toThrow(
      /more than one possible header row/,
    )
  })

  it('maps rows correctly when a header cell has surrounding whitespace, instead of leaving valid rows unsupported', () => {
    const workbook = utils.book_new()
    const paddedHeader = HEADER_ROW.map((name) => ` ${name} `)
    utils.book_append_sheet(
      workbook,
      utils.aoa_to_sheet([
        paddedHeader,
        [
          '2026-01-15 10:00:00 UTC',
          'card_spend',
          'Merchant A',
          'CLEARED',
          1,
          'EUR',
          '1234',
          'Jane Doe',
          1,
          'EUR',
          0,
          'EUR',
          'Category A',
          'Direct Pay',
        ],
      ]),
      'All Transactions',
    )

    const { rows, unsupported } = etherfiAdapter.parse(toArrayBuffer(workbook))
    expect(unsupported).toEqual([])
    expect(rows).toHaveLength(1)
    expect(rows[0].description).toBe('Merchant A')
  })

  it('imports Borrow Mode rows next to Direct Pay ones, since the columns are the same', () => {
    const row = (description: string, spendingMode: string) => [
      '2026-01-15 10:00:00 UTC',
      'card_spend',
      description,
      'CLEARED',
      12.5,
      'EUR',
      '1234',
      'Jane Doe',
      12.5,
      'EUR',
      0.31,
      'EUR',
      '5411 - Grocery Stores and Supermarkets',
      spendingMode,
    ]
    const workbook = utils.book_new()
    utils.book_append_sheet(
      workbook,
      utils.aoa_to_sheet([
        HEADER_ROW,
        row('Paid directly', 'Direct Pay'),
        row('Paid by borrowing', 'Borrow Mode'),
      ]),
      'All Transactions',
    )

    const { rows, unsupported } = etherfiAdapter.parse(toArrayBuffer(workbook))

    expect(unsupported).toEqual([])
    expect(rows.map((parsed) => [parsed.description, parsed.spendingMode])).toEqual([
      ['Paid directly', 'Direct Pay'],
      ['Paid by borrowing', 'Borrow Mode'],
    ])
  })
})
