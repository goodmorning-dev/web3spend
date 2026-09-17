import { utils } from 'xlsx'
import { describe, expect, it } from 'vitest'
import { EXPECTED_COLUMNS, resolveHeader } from './header'

const HEADER_ROW: string[] = [...EXPECTED_COLUMNS]

describe('resolveHeader', () => {
  it('finds the header row past a summary block, matching the sample export shape', () => {
    const sheet = utils.aoa_to_sheet([
      ['Transaction Summary'],
      [],
      ['Period', '2026-01-01 UTC - 2026-02-01 UTC'],
      ['Total Transactions', 2],
      [],
      [],
      HEADER_ROW,
      ['2026-01-15 10:00:00 UTC', 'card_spend', 'Merchant A'],
    ])

    const result = resolveHeader(sheet)
    expect(result).toEqual({ ok: true, header: { rowIndex: 6, columns: HEADER_ROW } })
  })

  it('finds the header on row 0 when there is no summary block', () => {
    const sheet = utils.aoa_to_sheet([HEADER_ROW, ['2026-01-15 10:00:00 UTC']])
    const result = resolveHeader(sheet)
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.header.rowIndex).toBe(0)
    }
  })

  it('reports an error when no row has all the expected column names', () => {
    const sheet = utils.aoa_to_sheet([
      ['timestamp', 'type', 'description'],
      ['2026-01-15 10:00:00 UTC', 'card_spend', 'Merchant A'],
    ])
    const result = resolveHeader(sheet)
    expect(result).toEqual({ ok: false, reason: 'Could not find the transaction header row.' })
  })

  it('is not thrown off by extra columns, a different column order, or surrounding whitespace', () => {
    const shuffled = [...HEADER_ROW].reverse().concat(['some extra column'])
    shuffled[0] = ` ${shuffled[0]} ` // whitespace around a real column name
    const sheet = utils.aoa_to_sheet([shuffled])
    const result = resolveHeader(sheet)
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.header.rowIndex).toBe(0)
      // the resolved columns are trimmed, so row-mapping never sees " type "
      expect(result.header.columns[0]).toBe(shuffled[0].trim())
    }
  })

  it('rejects a header row with more than one required column, instead of silently picking one', () => {
    const withDuplicateAmount = [...HEADER_ROW, 'amount']
    const sheet = utils.aoa_to_sheet([withDuplicateAmount])

    const result = resolveHeader(sheet)
    expect(result).toEqual({
      ok: false,
      reason: 'Row 1 has more than one "amount" column; expected exactly one.',
    })
  })

  it('rejects a workbook with two candidate header rows instead of importing rows from both', () => {
    const sheet = utils.aoa_to_sheet([
      HEADER_ROW,
      ['2026-01-15 10:00:00 UTC', 'card_spend', 'Merchant A'],
      [],
      HEADER_ROW,
      ['2026-02-15 10:00:00 UTC', 'card_spend', 'Merchant B'],
    ])

    const result = resolveHeader(sheet)
    expect(result).toEqual({
      ok: false,
      reason:
        'Found more than one possible header row (rows 1, 4); expected exactly one transaction table.',
    })
  })
})
