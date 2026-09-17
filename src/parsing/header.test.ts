import { utils } from 'xlsx'
import { describe, expect, it } from 'vitest'
import { detectHeaderRowIndex, EXPECTED_COLUMNS } from './header'

const HEADER_ROW: string[] = [...EXPECTED_COLUMNS]

describe('detectHeaderRowIndex', () => {
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

    expect(detectHeaderRowIndex(sheet)).toBe(6)
  })

  it('finds the header on row 0 when there is no summary block', () => {
    const sheet = utils.aoa_to_sheet([HEADER_ROW, ['2026-01-15 10:00:00 UTC']])
    expect(detectHeaderRowIndex(sheet)).toBe(0)
  })

  it('returns null when no row has all the expected column names', () => {
    const sheet = utils.aoa_to_sheet([
      ['timestamp', 'type', 'description'],
      ['2026-01-15 10:00:00 UTC', 'card_spend', 'Merchant A'],
    ])
    expect(detectHeaderRowIndex(sheet)).toBeNull()
  })

  it('is not thrown off by extra columns or a different column order', () => {
    const shuffled = [...HEADER_ROW].reverse().concat(['some extra column'])
    const sheet = utils.aoa_to_sheet([shuffled])
    expect(detectHeaderRowIndex(sheet)).toBe(0)
  })
})
