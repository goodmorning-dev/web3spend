import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { DayActivity } from '@/analyzers'
import { formatMoney } from '@/utils/format'
import ActivityHeatmap from './ActivityHeatmap'

function makeYearActivity(year: number): DayActivity[] {
  const days = new Date(Date.UTC(year, 11, 31)).getUTCDate() === 31 ? 365 : 366
  return Array.from({ length: days }, (_, index) => {
    const date = new Date(Date.UTC(year, 0, 1) + index * 86_400_000)
    const key = date.toISOString().slice(0, 10)
    return { key, spendMinor: 0, level: 0 }
  })
}

function getGrid(): HTMLElement {
  return screen.getByRole('grid', { name: /calendar heatmap of daily spending in 2026/i })
}

describe('ActivityHeatmap', () => {
  it('renders one cell per day of the year, accessibly labeled', () => {
    const activity = makeYearActivity(2026)
    activity[14] = { key: '2026-01-15', spendMinor: 4500, level: 3 }

    render(<ActivityHeatmap activity={activity} year={2026} currency="EUR" onSelectDay={vi.fn()} />)

    expect(getGrid()).toBeInTheDocument()
    expect(document.querySelectorAll('rect')).toHaveLength(activity.length)
    const expectedTitle = `2026-01-15: ${formatMoney(4500, 'EUR')}`.replace(/\s+/g, ' ')
    expect(screen.getByText(expectedTitle)).toBeInTheDocument()
  })

  it('calls onSelectDay with the year, month, and day for the clicked cell', async () => {
    const user = userEvent.setup()
    const activity = makeYearActivity(2026)
    const onSelectDay = vi.fn()

    render(
      <ActivityHeatmap activity={activity} year={2026} currency="EUR" onSelectDay={onSelectDay} />,
    )

    await user.click(document.getElementById('heatmap-day-14')!) // 2026-01-15

    expect(onSelectDay).toHaveBeenCalledWith(2026, 1, 15)
  })

  it('marks the currently selected day distinctly from the rest of the grid', () => {
    const activity = makeYearActivity(2026)

    render(
      <ActivityHeatmap
        activity={activity}
        year={2026}
        currency="EUR"
        selectedDateKey="2026-01-15"
        onSelectDay={vi.fn()}
      />,
    )

    expect(document.getElementById('heatmap-day-14')).toHaveAttribute('aria-selected', 'true')
    expect(document.getElementById('heatmap-day-13')).toHaveAttribute('aria-selected', 'false')
  })

  it('is keyboard operable: arrow keys move focus, Enter selects the focused day', async () => {
    const user = userEvent.setup()
    const activity = makeYearActivity(2026)
    const onSelectDay = vi.fn()

    render(
      <ActivityHeatmap activity={activity} year={2026} currency="EUR" onSelectDay={onSelectDay} />,
    )

    const grid = getGrid()
    grid.focus()
    // Jan 1, 2026 is a Thursday, so the grid starts at day-of-year index 0
    // with jan1Weekday=4; ArrowDown moves one day forward in the same
    // column, ArrowRight moves a full week (7 days) to the next column.
    await user.keyboard('{ArrowDown}{ArrowDown}{ArrowRight}')
    expect(grid).toHaveAttribute('aria-activedescendant', 'heatmap-day-9')

    await user.keyboard('{Enter}')
    expect(onSelectDay).toHaveBeenCalledWith(2026, 1, 10)
  })

  it('does not move focus past the first or last day of the year', async () => {
    const user = userEvent.setup()
    const activity = makeYearActivity(2026)

    render(<ActivityHeatmap activity={activity} year={2026} currency="EUR" onSelectDay={vi.fn()} />)

    const grid = getGrid()
    grid.focus()
    await user.keyboard('{ArrowUp}{ArrowLeft}')
    expect(grid).toHaveAttribute('aria-activedescendant', 'heatmap-day-0')

    await user.keyboard('{End}')
    expect(grid).toHaveAttribute('aria-activedescendant', `heatmap-day-${activity.length - 1}`)

    await user.keyboard('{ArrowDown}{ArrowRight}')
    expect(grid).toHaveAttribute('aria-activedescendant', `heatmap-day-${activity.length - 1}`)
  })
})
