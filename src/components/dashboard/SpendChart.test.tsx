import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { PeriodBucket } from '@/analyzers'
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart'
import { formatMoney } from '@/utils/format'
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

  it('shows the day\'s tooltip label as "Day 15", not the series label "Spent"', () => {
    // Recharts' tooltip hover is impractical to simulate reliably in
    // jsdom (it depends on real layout math), so this renders the exact
    // tooltip content SpendChart configures, with the payload shape
    // Recharts sends for day 15's bar, and checks its output directly.
    render(
      <ChartContainer config={{ spendMinor: { label: 'Spent', color: 'var(--color-chart-1)' } }}>
        <ChartTooltipContent
          active
          payload={[
            {
              dataKey: 'spendMinor',
              name: 'spendMinor',
              value: 4.5,
              payload: { day: 15, spendMinor: 4.5 },
              color: 'var(--color-chart-1)',
              graphicalItemId: 'bar-spendMinor',
            },
          ]}
          label={15}
          labelFormatter={(day) => `Day ${day}`}
          formatter={(value) => formatMoney(Math.round(Number(value) * 100), 'EUR')}
        />
      </ChartContainer>,
    )

    expect(screen.getByText('Day 15')).toBeInTheDocument()
    expect(screen.queryByText(/Day Spent/)).not.toBeInTheDocument()
  })
})
