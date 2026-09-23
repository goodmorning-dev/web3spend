import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { DayActivity } from '@/analyzers'
import { formatUtcMonthDay } from '@/utils/dates'
import { formatMoney } from '@/utils/format'
import ActivityHeatmap from './ActivityHeatmap'

function makeYearActivity(year: number): DayActivity[] {
  const days = new Date(Date.UTC(year, 11, 31)).getUTCDate() === 31 ? 365 : 366
  return Array.from({ length: days }, (_, index) => {
    const date = new Date(Date.UTC(year, 0, 1) + index * 86_400_000)
    const key = date.toISOString().slice(0, 10)
    return { key, spendMinor: 0, purchaseCount: 0, level: 0, countLevel: 0 }
  })
}

function getGrid(): HTMLElement {
  return screen.getByRole('grid', { name: /calendar heatmap of daily spending in 2026/i })
}

describe('ActivityHeatmap', () => {
  it('renders one cell per day of the year, accessibly labeled', () => {
    const activity = makeYearActivity(2026)
    activity[14] = {
      key: '2026-01-15',
      spendMinor: 4500,
      purchaseCount: 2,
      level: 3,
      countLevel: 4,
    }

    render(<ActivityHeatmap activity={activity} year={2026} currency="EUR" onSelectDay={vi.fn()} />)

    expect(getGrid()).toBeInTheDocument()
    expect(document.querySelectorAll('rect[role="gridcell"]')).toHaveLength(activity.length)
    // toHaveAttribute checks the raw attribute value, unlike getByText,
    // which normalizes whitespace; some locales format currency with a
    // non-breaking space, so this must match formatMoney's own output
    // exactly rather than a manually-normalized copy of it.
    const expectedLabel = `2026-01-15: ${formatMoney(4500, 'EUR')}`
    expect(document.getElementById('heatmap-day-14')).toHaveAttribute('aria-label', expectedLabel)
  })

  it('shows a custom tooltip on hover instead of a native browser tooltip', async () => {
    const user = userEvent.setup()
    const activity = makeYearActivity(2026)
    activity[14] = {
      key: '2026-01-15',
      spendMinor: 4500,
      purchaseCount: 2,
      level: 3,
      countLevel: 4,
    }

    render(<ActivityHeatmap activity={activity} year={2026} currency="EUR" onSelectDay={vi.fn()} />)

    const cell = document.getElementById('heatmap-day-14')!
    expect(cell.querySelector('title')).not.toBeInTheDocument()

    await user.hover(cell)
    expect(
      screen.getByText(`${formatMoney(4500, 'EUR')} spent`.replace(/\s+/g, ' ')),
    ).toBeInTheDocument()

    await user.unhover(cell)
    // the clear is deliberately debounced (see scheduleUnhoverDay) so
    // moving between adjacent cells, across the gap between them, doesn't
    // flicker the tooltip off and back on; it doesn't clear synchronously.
    await waitFor(() => {
      expect(
        screen.queryByText(`${formatMoney(4500, 'EUR')} spent`.replace(/\s+/g, ' ')),
      ).not.toBeInTheDocument()
    })
  })

  it('does not flicker off when moving straight from one cell to an adjacent one', () => {
    const activity = makeYearActivity(2026)
    activity[14] = {
      key: '2026-01-15',
      spendMinor: 4500,
      purchaseCount: 2,
      level: 3,
      countLevel: 4,
    } // heatmap-day-14
    activity[15] = {
      key: '2026-01-16',
      spendMinor: 1200,
      purchaseCount: 1,
      level: 1,
      countLevel: 1,
    } // heatmap-day-15

    render(<ActivityHeatmap activity={activity} year={2026} currency="EUR" onSelectDay={vi.fn()} />)

    const cellA = document.getElementById('heatmap-day-14')!
    const cellB = document.getElementById('heatmap-day-15')!

    fireEvent.mouseEnter(cellA)
    expect(
      screen.getByText(`${formatMoney(4500, 'EUR')} spent`.replace(/\s+/g, ' ')),
    ).toBeInTheDocument()

    // leaving one cell and entering its neighbor right away, as a real
    // mouse move across the gap between them would, must cancel the
    // pending clear rather than let the tooltip disappear in between.
    fireEvent.mouseLeave(cellA)
    fireEvent.mouseEnter(cellB)

    expect(
      screen.getByText(`${formatMoney(1200, 'EUR')} spent`.replace(/\s+/g, ' ')),
    ).toBeInTheDocument()
  })

  it('renders the tooltip outside the scrollable grid wrapper, so it never gets clipped by it', async () => {
    // The grid wrapper needs overflow-x-auto for wide/narrow screens, but
    // setting only overflow-x forces overflow-y's computed value to 'auto'
    // too (a CSS spec quirk), which would silently clip a tooltip nested
    // inside it for any cell near the top of the grid, where the tooltip
    // (anchored above the cell) pokes above the wrapper's own top edge.
    const user = userEvent.setup()
    const activity = makeYearActivity(2026)
    activity[3] = { key: '2026-01-04', spendMinor: 1200, purchaseCount: 1, level: 2, countLevel: 1 } // day-of-year index 3, row 0

    render(<ActivityHeatmap activity={activity} year={2026} currency="EUR" onSelectDay={vi.fn()} />)

    const cell = document.getElementById('heatmap-day-3')!
    await user.hover(cell)

    const tooltipText = screen.getByText(`${formatMoney(1200, 'EUR')} spent`.replace(/\s+/g, ' '))
    const scrollWrapper = cell.closest('svg')!.parentElement!
    expect(scrollWrapper.className).toContain('overflow-x-auto')
    expect(scrollWrapper.contains(tooltipText)).toBe(false)
  })

  it('shows a currency-scoped description under the Activity title', () => {
    const activity = makeYearActivity(2026)

    render(<ActivityHeatmap activity={activity} year={2026} currency="USD" onSelectDay={vi.fn()} />)

    expect(
      screen.getByText('Daily spend, USD · darker means more spent that day'),
    ).toBeInTheDocument()
  })

  it('starts on Spending and switches the shading, labels and description to transaction counts', async () => {
    const user = userEvent.setup()
    const activity = makeYearActivity(2026)
    activity[14] = {
      key: '2026-01-15',
      spendMinor: 4500,
      purchaseCount: 2,
      level: 1,
      countLevel: 4,
    }

    render(<ActivityHeatmap activity={activity} year={2026} currency="EUR" onSelectDay={vi.fn()} />)

    const spending = screen.getByRole('button', { name: 'Spending' })
    const transactions = screen.getByRole('button', { name: 'Transactions' })
    expect(spending).toHaveAttribute('aria-pressed', 'true')
    expect(transactions).toHaveAttribute('aria-pressed', 'false')
    const cell = document.getElementById('heatmap-day-14')!
    expect(cell).toHaveAttribute('fill-opacity', '0.28')

    await user.click(transactions)

    expect(transactions).toHaveAttribute('aria-pressed', 'true')
    expect(spending).toHaveAttribute('aria-pressed', 'false')
    expect(
      screen.getByText('Daily transactions, EUR · darker means more transactions that day'),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('grid', { name: /calendar heatmap of daily transactions in 2026/i }),
    ).toBeInTheDocument()
    expect(cell).toHaveAttribute('aria-label', '2026-01-15: 2 transactions')
    expect(cell).toHaveAttribute('fill-opacity', '1')
    expect(document.getElementById('heatmap-day-13')).toHaveAttribute(
      'aria-label',
      '2026-01-14: No transactions',
    )
  })

  it('leads the tooltip with whichever measure is selected, and shows the other under it', async () => {
    const user = userEvent.setup()
    const activity = makeYearActivity(2026)
    activity[14] = {
      key: '2026-01-15',
      spendMinor: 4500,
      purchaseCount: 1,
      level: 3,
      countLevel: 4,
    }
    const spent = `${formatMoney(4500, 'EUR')} spent`.replace(/\s+/g, ' ')

    render(<ActivityHeatmap activity={activity} year={2026} currency="EUR" onSelectDay={vi.fn()} />)
    const cell = document.getElementById('heatmap-day-14')!

    await user.hover(cell)
    let tooltip = within(screen.getByRole('tooltip'))
    expect(tooltip.getByText(spent)).toHaveClass('text-foreground')
    expect(tooltip.getByText('1 transaction')).toHaveClass('text-text-faint')

    await user.click(screen.getByRole('button', { name: 'Transactions' }))
    await user.hover(cell)
    tooltip = within(screen.getByRole('tooltip'))
    expect(tooltip.getByText('1 transaction')).toHaveClass('text-foreground')
    expect(tooltip.getByText(spent)).toHaveClass('text-text-faint')
  })

  it('sums up the year beside the grid, following the Spending / Transactions switch', async () => {
    const user = userEvent.setup()
    const activity = makeYearActivity(2026)
    activity[14] = {
      key: '2026-01-15',
      spendMinor: 4500,
      purchaseCount: 1,
      level: 4,
      countLevel: 1,
    }
    activity[15] = {
      key: '2026-01-16',
      spendMinor: 1200,
      purchaseCount: 3,
      level: 1,
      countLevel: 4,
    }
    const normalized = (text: string) => text.replace(/\s+/g, ' ')
    const stat = (label: string) => within(screen.getByText(label).parentElement!)

    render(<ActivityHeatmap activity={activity} year={2026} currency="EUR" onSelectDay={vi.fn()} />)

    expect(stat('Active days').getByText('2 days')).toBeInTheDocument()
    expect(stat('Longest streak').getByText('2 days')).toBeInTheDocument()
    expect(
      stat('Longest streak').getByText(normalized(`${formatUtcMonthDay('2026-01-15')} to 16`)),
    ).toBeInTheDocument()
    expect(stat('Biggest day').getByText(normalized(formatMoney(4500, 'EUR')))).toBeInTheDocument()
    expect(
      stat('Biggest day').getByText(normalized(formatUtcMonthDay('2026-01-15'))),
    ).toBeInTheDocument()
    // Jan 15, 2026 is a Thursday, and the only two days in range are it and Friday
    expect(stat('Top weekday').getByText('Thursdays')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Transactions' }))

    expect(screen.queryByText('Biggest day')).not.toBeInTheDocument()
    expect(stat('Busiest day').getByText('3 transactions')).toBeInTheDocument()
    expect(
      stat('Busiest day').getByText(normalized(formatUtcMonthDay('2026-01-16'))),
    ).toBeInTheDocument()
    expect(stat('Top weekday').getByText('Fridays')).toBeInTheDocument()
    expect(stat('Top weekday').getByText('3.0 on average')).toBeInTheDocument()
  })

  it('leaves the summary out for a year without purchases', () => {
    render(
      <ActivityHeatmap
        activity={makeYearActivity(2026)}
        year={2026}
        currency="EUR"
        onSelectDay={vi.fn()}
      />,
    )

    expect(screen.queryByText('Active days')).not.toBeInTheDocument()
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
