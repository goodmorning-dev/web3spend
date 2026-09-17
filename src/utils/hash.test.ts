import { describe, expect, it } from 'vitest'
import { sha256Hex } from './hash'

describe('sha256Hex', () => {
  it('is deterministic for the same input', async () => {
    const input = new TextEncoder().encode('hello world')
    expect(await sha256Hex(input)).toBe(await sha256Hex(input))
  })

  it('matches the known SHA-256 digest of an empty input', async () => {
    expect(await sha256Hex(new Uint8Array())).toBe(
      'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    )
  })

  it('changes when the input changes', async () => {
    const a = await sha256Hex(new TextEncoder().encode('a'))
    const b = await sha256Hex(new TextEncoder().encode('b'))
    expect(a).not.toBe(b)
  })
})
