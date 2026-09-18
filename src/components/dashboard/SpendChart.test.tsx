import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import type { SpendTrendPoint } from '@/analyzers'
import { formatMoney } from '@/utils/format'
import SpendChart, { DebouncedSpendChartTooltip, SpendChartTooltip } from './SpendChart'

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

  it('toggles a series off (dimmed, aria-pressed false) when its legend entry is clicked, and back on', async () => {
    const user = userEvent.setup()
    const trend = [
      makePoint({ day: 1, thisMonthMinor: 100, lastMonthMinor: 200, averageMonthlyMinor: 150 }),
    ]

    render(<SpendChart trend={trend} currency="EUR" />)

    const lastMonthLegend = screen.getByRole('button', { name: 'Last month' })
    expect(lastMonthLegend).toHaveAttribute('aria-pressed', 'true')
    expect(lastMonthLegend.className).not.toContain('opacity-35')

    await user.click(lastMonthLegend)
    expect(lastMonthLegend).toHaveAttribute('aria-pressed', 'false')
    expect(lastMonthLegend.className).toContain('opacity-35')

    await user.click(lastMonthLegend)
    expect(lastMonthLegend).toHaveAttribute('aria-pressed', 'true')
    expect(lastMonthLegend.className).not.toContain('opacity-35')
  })

  it('gives each legend entry its own series color, not the default text color', () => {
    const trend = [makePoint({ day: 1 })]
    render(<SpendChart trend={trend} currency="EUR" />)

    expect(screen.getByRole('button', { name: 'This month (to date)' })).toHaveStyle({
      color: 'var(--color-chart-1)',
    })
    expect(screen.getByRole('button', { name: 'Last month' })).toHaveStyle({
      color: 'var(--color-chart-5)',
    })
    expect(screen.getByRole('button', { name: 'Average monthly' })).toHaveStyle({
      color: 'var(--color-chart-2)',
    })
  })

  describe('SpendChartTooltip', () => {
    // Recharts' tooltip hover is impractical to simulate reliably in
    // jsdom (it depends on real layout math), so this renders the exact
    // tooltip component SpendChart configures, with the payload shape
    // Recharts sends for a given day, and checks its output directly.
    const payload = [
      { dataKey: 'lastMonthMinor', value: 9.5, name: 'lastMonthMinor' },
      { dataKey: 'averageMonthlyMinor', value: 10.3, name: 'averageMonthlyMinor' },
      { dataKey: 'thisMonthMinor', value: 4.5, name: 'thisMonthMinor' },
    ]

    it('shows "Day N" and every visible series in a fixed order (this month, last month, average)', () => {
      render(
        <SpendChartTooltip
          active
          payload={payload}
          label={15}
          currency="EUR"
          hiddenKeys={new Set()}
        />,
      )

      expect(screen.getByText('Day 15')).toBeInTheDocument()
      const rows = screen.getAllByText(/This month|Last month|Average/).map((el) => el.textContent)
      expect(rows).toEqual(['This month', 'Last month', 'Average'])
      expect(screen.getByText(formatMoney(450, 'EUR').replace(/\s+/g, ' '))).toBeInTheDocument()
      expect(screen.getByText(formatMoney(950, 'EUR').replace(/\s+/g, ' '))).toBeInTheDocument()
      expect(screen.getByText(formatMoney(1030, 'EUR').replace(/\s+/g, ' '))).toBeInTheDocument()
    })

    it('omits a series that has no value for this day (e.g. "this month" past today)', () => {
      const partialPayload = payload.filter((item) => item.dataKey !== 'thisMonthMinor')

      render(
        <SpendChartTooltip
          active
          payload={partialPayload}
          label={20}
          currency="EUR"
          hiddenKeys={new Set()}
        />,
      )

      expect(screen.queryByText('This month')).not.toBeInTheDocument()
      expect(screen.getByText('Last month')).toBeInTheDocument()
    })

    it('omits a series the legend has toggled off, even if Recharts still supplies it', () => {
      render(
        <SpendChartTooltip
          active
          payload={payload}
          label={15}
          currency="EUR"
          hiddenKeys={new Set(['averageMonthlyMinor'])}
        />,
      )

      expect(screen.getByText('This month')).toBeInTheDocument()
      expect(screen.getByText('Last month')).toBeInTheDocument()
      expect(screen.queryByText('Average')).not.toBeInTheDocument()
    })

    it('renders nothing while inactive', () => {
      const { container } = render(
        <SpendChartTooltip
          active={false}
          payload={payload}
          label={15}
          currency="EUR"
          hiddenKeys={new Set()}
        />,
      )

      expect(container).toBeEmptyDOMElement()
    })
  })

  describe('DebouncedSpendChartTooltip', () => {
    // Recharts flips `active` to false for a beat whenever the mouse
    // crosses a gap in its hit-tested regions (the plot's edge, a gap left
    // by a hidden series, ...) before the next point picks it back up; that
    // read as the tooltip flickering off and on. This checks the wrapper
    // rides through exactly that sequence without ever going blank.
    const payload = [{ dataKey: 'lastMonthMinor', value: 9.5, name: 'lastMonthMinor' }]

    it('does not go blank when Recharts briefly reports inactive between two active points', async () => {
      const { rerender } = render(
        <DebouncedSpendChartTooltip
          active
          payload={payload}
          label={15}
          currency="EUR"
          hiddenKeys={new Set()}
        />,
      )
      expect(screen.getByText('Day 15')).toBeInTheDocument()

      // the brief gap: Recharts reports inactive right before the next
      // point takes over, as a real continuous hover across it would.
      rerender(<DebouncedSpendChartTooltip active={false} currency="EUR" hiddenKeys={new Set()} />)
      expect(screen.getByText('Day 15')).toBeInTheDocument()

      rerender(
        <DebouncedSpendChartTooltip
          active
          payload={payload}
          label={16}
          currency="EUR"
          hiddenKeys={new Set()}
        />,
      )
      expect(screen.getByText('Day 16')).toBeInTheDocument()
    })

    it('eventually clears once the mouse actually leaves and nothing new arrives', async () => {
      const { container, rerender } = render(
        <DebouncedSpendChartTooltip
          active
          payload={payload}
          label={15}
          currency="EUR"
          hiddenKeys={new Set()}
        />,
      )
      expect(screen.getByText('Day 15')).toBeInTheDocument()

      rerender(<DebouncedSpendChartTooltip active={false} currency="EUR" hiddenKeys={new Set()} />)

      await waitFor(() => expect(container).toBeEmptyDOMElement())
    })
  })
})
