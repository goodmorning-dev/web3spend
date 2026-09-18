import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { PeriodBucket } from '@/analyzers'
import SpendChart from './SpendChart'

function makeBucket(overrides: Partial<PeriodBucket> = {}): PeriodBucket {
  return {
    key: '2026-03-01',
    spendMinor: 0,
    cashbackMinor: 0,
    effectiveCashbackPct: null,
    ...overrides,
  }
}

describe('SpendChart', () => {
  it('renders a heading and a chart for the given daily buckets', () => {
    const buckets = [
      makeBucket({ key: '2026-03-01', spendMinor: 450 }),
      makeBucket({ key: '2026-03-02', spendMinor: 0 }),
    ]

    render(<SpendChart buckets={buckets} currency="EUR" />)

    expect(screen.getByText('Daily spend')).toBeInTheDocument()
  })
})
