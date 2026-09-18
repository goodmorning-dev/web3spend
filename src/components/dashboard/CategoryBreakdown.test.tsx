import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { CategoryBucket } from '@/analyzers'
import { formatMoney } from '@/utils/format'
import CategoryBreakdown from './CategoryBreakdown'

describe('CategoryBreakdown', () => {
  it('lists each category with its amount and share, sorted as given', () => {
    const buckets: CategoryBucket[] = [
      { category: 'Groceries', spendMinor: 700, share: 0.7 },
      { category: 'Transport', spendMinor: 300, share: 0.3 },
    ]

    render(<CategoryBreakdown buckets={buckets} currency="EUR" onViewAll={() => {}} />)

    expect(screen.getByText('Spending by category')).toBeInTheDocument()
    expect(screen.getByText('Groceries')).toBeInTheDocument()
    expect(screen.getByText('Transport')).toBeInTheDocument()
    expect(screen.getByText('70%')).toBeInTheDocument()
    expect(screen.getByText('30%')).toBeInTheDocument()
    // total spent (700 + 300) shown at the donut's center
    expect(screen.getByText(formatMoney(1000, 'EUR').replace(/\s+/g, ' '))).toBeInTheDocument()
  })

  it('shows a fallback message instead of an empty chart when there is no cleared spend', () => {
    render(<CategoryBreakdown buckets={[]} currency="EUR" onViewAll={() => {}} />)

    expect(screen.getByText('Spending by category')).toBeInTheDocument()
    expect(screen.getByText('No cleared purchases in this period yet.')).toBeInTheDocument()
  })

  it('treats a raw category string as plain text, never as a chart config key that could inject CSS', () => {
    // shadcn's ChartContainer writes each ChartConfig key, unescaped, into a
    // <style> tag; a category built from a ChartConfig key (as an earlier
    // version of this component did) could close its declaration early and
    // inject a new rule of its own.
    const maliciousCategory = '5411 } .injected { --pwned: url(https://evil.example/leak); } /*'
    const buckets: CategoryBucket[] = [{ category: maliciousCategory, spendMinor: 500, share: 1 }]

    render(<CategoryBreakdown buckets={buckets} currency="EUR" onViewAll={() => {}} />)

    // rendered as ordinary, auto-escaped text in the category list
    expect(screen.getByText(maliciousCategory)).toBeInTheDocument()

    // never reaches a <style> tag's contents as an injected rule
    const styleText = [...document.querySelectorAll('style')]
      .map((style) => style.textContent)
      .join('\n')
    expect(styleText).not.toContain('--pwned')
    expect(styleText).not.toContain('.injected')
    expect(styleText).not.toContain('evil.example')
  })

  it('shows every category as-is when there are 5 or fewer', () => {
    const buckets: CategoryBucket[] = [
      { category: 'Food', spendMinor: 350, share: 0.35 },
      { category: 'Shopping', spendMinor: 250, share: 0.25 },
      { category: 'Transport', spendMinor: 200, share: 0.2 },
      { category: 'Health', spendMinor: 100, share: 0.1 },
      { category: 'Other stuff', spendMinor: 100, share: 0.1 },
    ]

    render(<CategoryBreakdown buckets={buckets} currency="EUR" onViewAll={() => {}} />)

    expect(screen.getByText('Food')).toBeInTheDocument()
    expect(screen.getByText('Shopping')).toBeInTheDocument()
    expect(screen.getByText('Transport')).toBeInTheDocument()
    expect(screen.getByText('Health')).toBeInTheDocument()
    expect(screen.getByText('Other stuff')).toBeInTheDocument()
    expect(screen.queryByText('Other')).not.toBeInTheDocument()
  })

  it('rolls the 6th category and beyond into a single "Other" bucket, keeping the true grand total', () => {
    const buckets: CategoryBucket[] = [
      { category: 'Food', spendMinor: 500, share: 0.5 },
      { category: 'Shopping', spendMinor: 200, share: 0.2 },
      { category: 'Transport', spendMinor: 100, share: 0.1 },
      { category: 'Health', spendMinor: 80, share: 0.08 },
      { category: 'Utilities', spendMinor: 70, share: 0.07 },
      { category: 'Entertainment', spendMinor: 30, share: 0.03 },
      { category: 'Subscriptions', spendMinor: 20, share: 0.02 },
    ]

    render(<CategoryBreakdown buckets={buckets} currency="EUR" onViewAll={() => {}} />)

    expect(screen.getByText('Food')).toBeInTheDocument()
    expect(screen.getByText('Shopping')).toBeInTheDocument()
    expect(screen.getByText('Transport')).toBeInTheDocument()
    expect(screen.getByText('Health')).toBeInTheDocument()
    expect(screen.getByText('Utilities')).toBeInTheDocument()
    expect(screen.queryByText('Entertainment')).not.toBeInTheDocument()
    expect(screen.queryByText('Subscriptions')).not.toBeInTheDocument()

    expect(screen.getByText('Other')).toBeInTheDocument()
    expect(screen.getByText(formatMoney(50, 'EUR').replace(/\s+/g, ' '))).toBeInTheDocument() // 30 + 20
    expect(screen.getByText('5%')).toBeInTheDocument() // 3% + 2%

    // the donut center total is never reduced by the rollup
    expect(screen.getByText(formatMoney(1000, 'EUR').replace(/\s+/g, ' '))).toBeInTheDocument()
  })

  it('shows the full category name on hover via a title attribute, even when truncated', () => {
    const longCategory = 'Service Stations (with or without Ancillary Services)'
    const buckets: CategoryBucket[] = [{ category: longCategory, spendMinor: 100, share: 1 }]

    render(<CategoryBreakdown buckets={buckets} currency="EUR" onViewAll={() => {}} />)

    expect(screen.getByText(longCategory)).toHaveAttribute('title', longCategory)
  })

  it('calls onViewAll when "View all" is clicked', async () => {
    const user = userEvent.setup()
    const onViewAll = vi.fn()
    const buckets: CategoryBucket[] = [{ category: 'Groceries', spendMinor: 100, share: 1 }]

    render(<CategoryBreakdown buckets={buckets} currency="EUR" onViewAll={onViewAll} />)
    await user.click(screen.getByRole('button', { name: /view all/i }))

    expect(onViewAll).toHaveBeenCalledTimes(1)
  })
})
