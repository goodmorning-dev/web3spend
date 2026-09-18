import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { SpendTrendPoint } from '@/analyzers'
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart'
import { formatMoney } from '@/utils/format'
import SpendChart from './SpendChart'

function makePoint(overrides: Partial<SpendTrendPoint> = {}): SpendTrendPoint {
  return {
    day: 1,
    thisMonthMinor: 0,
    lastMonthMinor: 0,
    averageMonthlyMinor: 0,
    ...overrides,
  }
}

describe('SpendChart', () => {
  it('renders a heading, the 3-series legend, and a chart for the given trend', () => {
    const trend = [
      makePoint({ day: 1, thisMonthMinor: 450, lastMonthMinor: 300, averageMonthlyMinor: 350 }),
      makePoint({ day: 2, thisMonthMinor: null, lastMonthMinor: 600, averageMonthlyMinor: 700 }),
    ]

    render(<SpendChart trend={trend} currency="EUR" />)

    expect(screen.getByText('Spending this month')).toBeInTheDocument()
    expect(screen.getByText('Hover to compare')).toBeInTheDocument()
    expect(screen.getByText('This month (to date)')).toBeInTheDocument()
    expect(screen.getByText('Last month')).toBeInTheDocument()
    expect(screen.getByText('Average monthly')).toBeInTheDocument()
  })

  it('shows the day\'s tooltip label as "Day 15", not a series label', () => {
    // Recharts' tooltip hover is impractical to simulate reliably in
    // jsdom (it depends on real layout math), so this renders the exact
    // tooltip content SpendChart configures, with the payload shape
    // Recharts sends for day 15, and checks its output directly.
    render(
      <ChartContainer
        config={{
          thisMonthMinor: { label: 'This month (to date)', color: 'var(--color-chart-1)' },
        }}
      >
        <ChartTooltipContent
          active
          payload={[
            {
              dataKey: 'thisMonthMinor',
              name: 'thisMonthMinor',
              value: 4.5,
              payload: { day: 15, thisMonthMinor: 4.5 },
              color: 'var(--color-chart-1)',
              graphicalItemId: 'area-thisMonthMinor',
            },
          ]}
          label={15}
          labelFormatter={(day) => `Day ${day}`}
          formatter={(value) => formatMoney(Math.round(Number(value) * 100), 'EUR')}
        />
      </ChartContainer>,
    )

    expect(screen.getByText('Day 15')).toBeInTheDocument()
    expect(screen.queryByText(/Day This month/)).not.toBeInTheDocument()
  })
})
