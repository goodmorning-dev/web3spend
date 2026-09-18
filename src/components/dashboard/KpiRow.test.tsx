import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { PeriodSummary } from '@/analyzers'
import { formatMoney } from '@/utils/format'
import KpiRow from './KpiRow'

// Testing Library's default text matcher collapses whitespace in the DOM
// text it compares against, but not in a plain-string matcher argument.
// Some locales format currency with a non-breaking space (e.g. "28,40 €"),
// so the expected string needs the same collapsing to match.
function normalizeWhitespace(text: string): string {
  return text.replace(/\s+/g, ' ')
}

function makeSummary(overrides: Partial<PeriodSummary> = {}): PeriodSummary {
  return {
    clearedSpendMinor: 2840,
    clearedCount: 12,
    clearedCashbackMinor: 71,
    effectiveCashbackPct: 2.5,
    pendingSpendMinor: 0,
    pendingCount: 0,
    cancelledCount: 0,
    ...overrides,
  }
}

describe('KpiRow', () => {
  it('shows total spent, cashback earned, and the effective rate, formatted in the given currency', () => {
    render(<KpiRow summary={makeSummary()} currency="EUR" />)

    expect(screen.getByText('Total spent')).toBeInTheDocument()
    expect(screen.getByText(normalizeWhitespace(formatMoney(2840, 'EUR')))).toBeInTheDocument()
    expect(screen.getByText('across 12 cleared purchases')).toBeInTheDocument()

    expect(screen.getByText('Cashback earned')).toBeInTheDocument()
    expect(screen.getByText(normalizeWhitespace(formatMoney(71, 'EUR')))).toBeInTheDocument()

    expect(screen.getByText('Effective cashback')).toBeInTheDocument()
    expect(screen.getByText('2.50%')).toBeInTheDocument()
  })

  it('shows Unavailable rather than 0% when the effective rate is null', () => {
    render(<KpiRow summary={makeSummary({ effectiveCashbackPct: null })} currency="EUR" />)
    expect(screen.getByText('Unavailable')).toBeInTheDocument()
  })

  it('uses singular "purchase" for exactly one cleared purchase', () => {
    render(<KpiRow summary={makeSummary({ clearedCount: 1 })} currency="EUR" />)
    expect(screen.getByText('across 1 cleared purchase')).toBeInTheDocument()
  })
})
