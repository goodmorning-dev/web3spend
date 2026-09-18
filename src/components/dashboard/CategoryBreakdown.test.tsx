import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { CategoryBucket } from '@/analyzers'
import { formatMoney } from '@/utils/format'
import CategoryBreakdown from './CategoryBreakdown'

describe('CategoryBreakdown', () => {
  it('lists each category with its amount and share, sorted as given', () => {
    const buckets: CategoryBucket[] = [
      { category: 'Groceries', spendMinor: 700, share: 0.7 },
      { category: 'Transport', spendMinor: 300, share: 0.3 },
    ]

    render(<CategoryBreakdown buckets={buckets} currency="EUR" />)

    expect(screen.getByText('Spending by category')).toBeInTheDocument()
    expect(screen.getByText('Groceries')).toBeInTheDocument()
    expect(screen.getByText('Transport')).toBeInTheDocument()
    expect(screen.getByText('70%')).toBeInTheDocument()
    expect(screen.getByText('30%')).toBeInTheDocument()
    // total spent (700 + 300) shown at the donut's center
    expect(screen.getByText(formatMoney(1000, 'EUR').replace(/\s+/g, ' '))).toBeInTheDocument()
  })

  it('shows a fallback message instead of an empty chart when there is no cleared spend', () => {
    render(<CategoryBreakdown buckets={[]} currency="EUR" />)

    expect(screen.getByText('Spending by category')).toBeInTheDocument()
    expect(screen.getByText('No cleared purchases in this period yet.')).toBeInTheDocument()
  })
})
