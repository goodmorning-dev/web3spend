import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
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

describe('ActivityHeatmap', () => {
  it('renders one cell per day of the year, accessibly labeled', () => {
    const activity = makeYearActivity(2026)
    activity[14] = { key: '2026-01-15', spendMinor: 4500, level: 3 }

    render(<ActivityHeatmap activity={activity} year={2026} currency="EUR" />)

    expect(
      screen.getByRole('img', { name: /calendar heatmap of daily spending in 2026/i }),
    ).toBeInTheDocument()
    expect(document.querySelectorAll('rect')).toHaveLength(activity.length)
    const expectedTitle = `2026-01-15: ${formatMoney(4500, 'EUR')}`.replace(/\s+/g, ' ')
    expect(screen.getByText(expectedTitle)).toBeInTheDocument()
  })
})
