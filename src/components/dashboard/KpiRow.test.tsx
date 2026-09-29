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
    spendMinor: 2840,
    purchaseCount: 12,
    cashbackMinor: 71,
    cashbackComplete: true,
    cashbackByCurrency: [{ currency: 'EUR', amountMinor: 71, pendingMinor: 0 }],
    effectiveCashbackPct: 2.5,
    pendingCount: 0,
    pendingSpendMinor: 0,
    pendingCashbackMinor: 0,
    cancelledCount: 0,
    ...overrides,
  }
}

describe('KpiRow', () => {
  it('shows total spent, cashback earned, and the effective rate, formatted in the given currency', () => {
    render(<KpiRow summary={makeSummary()} currency="EUR" />)

    expect(screen.getByText('Total spent')).toBeInTheDocument()
    expect(screen.getByText(normalizeWhitespace(formatMoney(2840, 'EUR')))).toBeInTheDocument()
    expect(screen.getByText('across 12 purchases')).toBeInTheDocument()

    expect(screen.getByText('Cashback earned')).toBeInTheDocument()
    expect(screen.getByText(normalizeWhitespace(formatMoney(71, 'EUR')))).toBeInTheDocument()

    expect(screen.getByText('Effective cashback')).toBeInTheDocument()
    expect(screen.getByText('2.50%')).toBeInTheDocument()
  })

  it('shows Unavailable rather than 0% when the effective rate is null', () => {
    render(<KpiRow summary={makeSummary({ effectiveCashbackPct: null })} currency="EUR" />)
    expect(screen.getByText('Unavailable')).toBeInTheDocument()
  })

  it('uses singular "purchase" for exactly one purchase', () => {
    render(<KpiRow summary={makeSummary({ purchaseCount: 1 })} currency="EUR" />)
    expect(screen.getByText('across 1 purchase')).toBeInTheDocument()
  })

  it('says how many of the purchases are still pending', () => {
    render(<KpiRow summary={makeSummary({ purchaseCount: 12, pendingCount: 2 })} currency="EUR" />)
    expect(screen.getByText('across 12 purchases, 2 pending')).toBeInTheDocument()
  })

  it('splits spend into settled and pending, and cashback into received and pending', () => {
    render(
      <KpiRow
        summary={makeSummary({
          spendMinor: 2840,
          cashbackMinor: 71,
          pendingCount: 1,
          pendingSpendMinor: 450,
          pendingCashbackMinor: 11,
        })}
        currency="EUR"
      />,
    )

    const detailWithText = (text: string) =>
      screen.getByText(
        (_, element) =>
          element?.tagName === 'SPAN' && normalizeWhitespace(element.textContent ?? '') === text,
      )
    const money = (minor: number) => normalizeWhitespace(formatMoney(minor, 'EUR'))

    expect(detailWithText(`${money(2390)} settled · ${money(450)} pending`)).toBeInTheDocument()
    expect(detailWithText(`${money(60)} received · ${money(11)} pending`)).toBeInTheDocument()
  })

  it('shows no split when nothing is pending', () => {
    render(<KpiRow summary={makeSummary()} currency="EUR" />)
    expect(screen.queryByText(/settled/)).not.toBeInTheDocument()
    expect(screen.queryByText(/received/)).not.toBeInTheDocument()
  })

  it('shows cashback recorded in another currency in that currency, and says why the rate is unavailable', () => {
    // ether.fi records the cashback on purchases in yen in USD
    render(
      <KpiRow
        summary={makeSummary({
          spendMinor: 6961900,
          cashbackComplete: false,
          cashbackMinor: 0,
          cashbackByCurrency: [{ currency: 'USD', amountMinor: 1336, pendingMinor: 0 }],
          effectiveCashbackPct: null,
        })}
        currency="JPY"
      />,
    )

    expect(screen.getByText(normalizeWhitespace(formatMoney(1336, 'USD')))).toBeInTheDocument()
    expect(screen.getByText('recorded on these purchases, in USD')).toBeInTheDocument()
    // only the rate, which would need an exchange rate, stays unavailable
    expect(screen.getAllByText('Unavailable')).toHaveLength(1)
    expect(screen.getByText('Cashback is in USD, spending in JPY')).toBeInTheDocument()
  })

  it('shows cashback in more than one currency side by side rather than a partial total', () => {
    render(
      <KpiRow
        summary={makeSummary({
          cashbackComplete: false,
          cashbackMinor: 20,
          cashbackByCurrency: [
            { currency: 'EUR', amountMinor: 20, pendingMinor: 0 },
            { currency: 'USD', amountMinor: 30, pendingMinor: 0 },
          ],
          effectiveCashbackPct: null,
        })}
        currency="EUR"
      />,
    )

    expect(
      screen.getByText(
        normalizeWhitespace(`${formatMoney(20, 'EUR')} + ${formatMoney(30, 'USD')}`),
      ),
    ).toBeInTheDocument()
    expect(screen.getByText('recorded on these purchases, in EUR and USD')).toBeInTheDocument()
    expect(screen.getByText('Some cashback is in USD, spending in EUR')).toBeInTheDocument()
  })

  it('splits cashback recorded in another currency into received and pending in that currency', () => {
    render(
      <KpiRow
        summary={makeSummary({
          spendMinor: 6961900,
          pendingCount: 1,
          pendingSpendMinor: 51000,
          cashbackComplete: false,
          cashbackMinor: 0,
          cashbackByCurrency: [{ currency: 'USD', amountMinor: 1336, pendingMinor: 98 }],
          effectiveCashbackPct: null,
        })}
        currency="JPY"
      />,
    )

    expect(
      screen.getByText(
        (_, element) =>
          element?.tagName === 'SPAN' &&
          normalizeWhitespace(element.textContent ?? '') ===
            normalizeWhitespace(
              `${formatMoney(1238, 'USD')} received · ${formatMoney(98, 'USD')} pending`,
            ),
      ),
    ).toBeInTheDocument()
  })
})
