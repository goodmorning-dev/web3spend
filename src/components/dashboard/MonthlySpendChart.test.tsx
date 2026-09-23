import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { MonthBucket } from '@/analyzers'
import { formatMoney } from '@/utils/format'
import MonthlySpendChart from './MonthlySpendChart'

function bucket(key: string, spendMinor: number, hasTransactions = true): MonthBucket {
  return { key, spendMinor, cashbackMinor: 0, effectiveCashbackPct: null, hasTransactions }
}

// Testing Library collapses whitespace, including the non-breaking spaces
// some locales put in money strings.
function normalized(text: string): string {
  return text.replace(/\s+/g, ' ')
}

describe('MonthlySpendChart', () => {
  it('averages only the full months in between, and says why the edges are left out', () => {
    render(
      <MonthlySpendChart
        buckets={[
          bucket('2026-06', 5000),
          bucket('2026-07', 30000),
          bucket('2026-08', 10000),
          bucket('2026-09', 3000),
        ]}
        currency="EUR"
        periodLabel="All time"
      />,
    )

    expect(screen.getByText('Spending by month')).toBeInTheDocument()
    expect(screen.getByText('All time')).toBeInTheDocument()
    // July and August only; June and September may be partial
    expect(
      screen.getByText(normalized(`Average full month · ${formatMoney(20000, 'EUR')}`)),
    ).toBeInTheDocument()
    expect(screen.getByText(/faded months may only be partly covered/i)).toBeInTheDocument()
  })

  it('shows no average, and explains it, when there are no full months yet', () => {
    render(
      <MonthlySpendChart
        buckets={[bucket('2026-08', 30000), bucket('2026-09', 3000)]}
        currency="EUR"
        periodLabel="All time"
      />,
    )

    expect(screen.queryByText(/average full month/i)).not.toBeInTheDocument()
    expect(screen.getByText(/no full months to average yet/i)).toBeInTheDocument()
  })

  it('says so when there is no spending in the period', () => {
    render(<MonthlySpendChart buckets={[]} currency="EUR" periodLabel="All time" />)

    expect(screen.getByText('No spending in this period.')).toBeInTheDocument()
  })
})
