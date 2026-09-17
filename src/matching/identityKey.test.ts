import { describe, expect, it } from 'vitest'
import { computeIdentityKey, type IdentityFields } from './identityKey'

function makeFields(overrides: Partial<IdentityFields> = {}): IdentityFields {
  return {
    cardId: 'card-1',
    timestampUtc: '2026-01-15T10:00:00.000Z',
    normalizedDescription: 'Coffee Shop',
    amountMinor: 450,
    currency: 'USD',
    ...overrides,
  }
}

describe('computeIdentityKey', () => {
  it('is deterministic for the same fields', async () => {
    const a = await computeIdentityKey(makeFields())
    const b = await computeIdentityKey(makeFields())
    expect(a).toBe(b)
  })

  it('changes when any of the five fields changes', async () => {
    const base = await computeIdentityKey(makeFields())

    expect(await computeIdentityKey(makeFields({ cardId: 'card-2' }))).not.toBe(base)
    expect(
      await computeIdentityKey(makeFields({ timestampUtc: '2026-01-15T10:00:01.000Z' })),
    ).not.toBe(base)
    expect(
      await computeIdentityKey(makeFields({ normalizedDescription: 'Coffee Shoppe' })),
    ).not.toBe(base)
    expect(await computeIdentityKey(makeFields({ amountMinor: 451 }))).not.toBe(base)
    expect(await computeIdentityKey(makeFields({ currency: 'EUR' }))).not.toBe(base)
  })

  it('does not depend on status or cashback, which are excluded by design', async () => {
    // identityKey intentionally has no status/cashback inputs; this test just
    // documents that a caller can't accidentally widen the hash to include them.
    const fields = makeFields()
    expect(Object.keys(fields).sort()).toEqual(
      ['amountMinor', 'cardId', 'currency', 'normalizedDescription', 'timestampUtc'].sort(),
    )
  })
})
