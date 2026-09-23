import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { PeriodBucket } from '@/analyzers'
import { formatMoney } from '@/utils/format'
import MonthlySpendChart from './MonthlySpendChart'

function bucket(key: string, spendMinor: number): PeriodBucket {
  return { key, spendMinor, cashbackMinor: 0, effectiveCashbackPct: null }
}

// Testing Library collapses whitespace, including the non-breaking spaces
// some locales put in money strings.
function normalized(text: string): string {
  return text.replace(/\s+/g, ' ')
}

describe('MonthlySpendChart', () => {
  it('names the period and shows the average month in the legend', () => {
    render(
      <MonthlySpendChart
        buckets={[bucket('2026-07', 30000), bucket('2026-08', 10000), bucket('2026-09', 20000)]}
        currency="EUR"
        periodLabel="2026"
      />,
    )

    expect(screen.getByText('Spending by month')).toBeInTheDocument()
    expect(screen.getByText('2026')).toBeInTheDocument()
    expect(screen.getByText('Monthly spend')).toBeInTheDocument()
    expect(
      screen.getByText(normalized(`Average month · ${formatMoney(20000, 'EUR')}`)),
    ).toBeInTheDocument()
  })

  it('leaves the average out when there is only one month to compare', () => {
    render(
      <MonthlySpendChart
        buckets={[bucket('2026-09', 5000)]}
        currency="EUR"
        periodLabel="All time"
      />,
    )

    expect(screen.queryByText(/average month/i)).not.toBeInTheDocument()
  })

  it('says so when there is no spending in the period', () => {
    render(<MonthlySpendChart buckets={[]} currency="EUR" periodLabel="All time" />)

    expect(screen.getByText('No spending in this period.')).toBeInTheDocument()
  })
})
