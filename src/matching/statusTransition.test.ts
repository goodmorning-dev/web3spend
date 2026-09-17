import { describe, expect, it } from 'vitest'
import { resolveStatusTransition } from './statusTransition'

describe('resolveStatusTransition', () => {
  it('advances a non-terminal status to whatever is newly reported', () => {
    expect(resolveStatusTransition('PENDING', 'CLEARED')).toBe('CLEARED')
    expect(resolveStatusTransition('PENDING', 'CANCELLED')).toBe('CANCELLED')
    expect(resolveStatusTransition('UNKNOWN', 'CLEARED')).toBe('CLEARED')
    expect(resolveStatusTransition('PENDING', 'PENDING')).toBe('PENDING')
  })

  it('never downgrades a CLEARED transaction, even if a later import reports PENDING', () => {
    expect(resolveStatusTransition('CLEARED', 'PENDING')).toBe('CLEARED')
    expect(resolveStatusTransition('CLEARED', 'UNKNOWN')).toBe('CLEARED')
    expect(resolveStatusTransition('CLEARED', 'CANCELLED')).toBe('CLEARED')
  })

  it('never moves a CANCELLED transaction back to a non-terminal status', () => {
    expect(resolveStatusTransition('CANCELLED', 'PENDING')).toBe('CANCELLED')
    expect(resolveStatusTransition('CANCELLED', 'CLEARED')).toBe('CANCELLED')
  })
})
