import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { computeCashbackProgress } from '@/cashback/progress'
import type { StandardTransaction } from '@/types/transaction'
import { CashbackStepsCard } from './CashbackSteps'

// At $1.25 a euro, Core's euro steps end at $800 = €640 and $1,500 = €1,200.
const reference = { rate: 1.25, date: '2026-10-09' }

function purchase(amountMinor: number, cashbackMinor: number, day = 5): StandardTransaction {
  return {
    id: `t${amountMinor}-${day}`,
    cardId: 'card-1',
    timestampUtc: `2026-10-${String(day).padStart(2, '0')}T12:00:00.000Z`,
    type: 'card_spend',
    description: 'Shop',
    status: 'CLEARED',
    amountMinor,
    currency: 'EUR',
    originalAmountMinor: amountMinor,
    originalCurrency: 'EUR',
    cashbackMinor,
    cashbackCurrency: 'EUR',
    categoryRaw: 'Groceries',
    spendingMode: 'Direct Pay',
    identityKey: `t${amountMinor}-${day}`,
    importId: 'import-1',
  }
}

function renderCard(transactions: StandardTransaction[] | null, currency = 'EUR') {
  const progress =
    transactions &&
    computeCashbackProgress(transactions, {
      level: 'core',
      currency,
      eurUsdRate: reference.rate,
      year: 2026,
      month: 10,
    })
  return render(
    <MemoryRouter>
      <CashbackStepsCard
        state={{ level: progress ? 'core' : null, progress, year: 2026, month: 10 }}
        eurUsdReference={reference}
      />
    </MemoryRouter>,
  )
}

// Testing Library collapses whitespace, including the non-breaking spaces
// some locales put in money strings.
function euros(amount: number): string {
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })
    .format(amount)
    .replace(/\s+/g, ' ')
}

// The month's name the way the viewer's locale writes it.
const october = new Date(Date.UTC(2026, 9, 1)).toLocaleDateString(undefined, {
  month: 'long',
  timeZone: 'UTC',
})

describe('CashbackStepsCard', () => {
  it('asks for the level first, linking to it in Settings', () => {
    renderCard(null)

    expect(screen.getByRole('heading', { name: 'How much is left at 3%?' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Pick your level' })).toHaveAttribute(
      'href',
      '/app/settings#membership',
    )
  })

  it("shows what's left at 3% in euros, what comes after, and that it's an estimate", () => {
    renderCard([purchase(20_000, 600)])

    expect(screen.getByText(`≈ ${euros(440)} left at 3%`)).toBeInTheDocument()
    expect(
      screen.getByText(`Then 1% up to ≈ ${euros(1_200)}, and 0.1% after that.`),
    ).toBeInTheDocument()
    expect(screen.getByText(/an estimate: ether\.fi converts euro spending/i)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /change level/i })).toHaveAttribute(
      'href',
      '/app/settings#membership',
    )
  })

  it('says so when the higher steps are used up', () => {
    renderCard([purchase(64_000, 1_920, 2), purchase(70_000, 70, 3)])

    expect(screen.getByText(`0.1% for the rest of ${october}`)).toBeInTheDocument()
    expect(screen.getByText(`The higher steps are used up for ${october}.`)).toBeInTheDocument()
  })

  it("asks for a fresh import when nothing's been imported for the month yet", () => {
    renderCard([])

    expect(screen.getByText(`Nothing imported for ${october} yet`)).toBeInTheDocument()
  })

  it('shows exact dollars, with no estimate, on the dollar ladder', () => {
    renderCard([{ ...purchase(50_000, 1_500), currency: 'USD', cashbackCurrency: 'USD' }], 'USD')

    const dollars = new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    })
      .format(1_500)
      .replace(/\s+/g, ' ')
    expect(screen.getByText(`${dollars} left at 3%`)).toBeInTheDocument()
    expect(screen.queryByText(/an estimate/i)).not.toBeInTheDocument()
  })
})
