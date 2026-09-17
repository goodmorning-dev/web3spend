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
 * non-prefixed category, one with a trailing non-breaking space, and one
 * unsupported row). Never the real anonymized file, which never leaves
 * web3spend-mvp/ and is never read by anything under test.
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

  it('reports the unsupported row with its actual spreadsheet row number and reason', () => {
    const { unsupported } = etherfiAdapter.parse(toArrayBuffer(buildWorkbook()))

    expect(unsupported).toEqual([{ rowNumber: 12, reason: 'Unsupported status: REVERSED' }])
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
})
