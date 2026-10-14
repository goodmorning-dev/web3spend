import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { MEMBERSHIP_LEVELS, type MembershipLevel } from '@/cashback/ladders'
import { computeCashbackProgress, detectLevel, estimateMonthlyCashback } from '@/cashback/progress'
import type { CashbackStepsState } from '@/hooks/useCashbackProgress'
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

/** The state the dashboard would build for October 2026. */
function stateFor(
  transactions: StandardTransaction[],
  {
    saved = null,
    currency = 'EUR',
    isCurrentMonth = true,
  }: { saved?: MembershipLevel | null; currency?: string; isCurrentMonth?: boolean } = {},
): CashbackStepsState {
  const options = { eurUsdRate: reference.rate, year: 2026, month: 10 }
  const detection = detectLevel(transactions, options)
  const level = saved ?? detection.detected ?? detection.possible[0] ?? 'core'
  const estimates = Object.fromEntries(
    MEMBERSHIP_LEVELS.map(({ value }) => [
      value,
      estimateMonthlyCashback(transactions, { ...options, currency, level: value }),
    ]),
  ) as Record<MembershipLevel, number>
  return {
    year: 2026,
    month: 10,
    isCurrentMonth,
    saved,
    detection,
    level,
    progress: computeCashbackProgress(transactions, {
      ...options,
      currency,
      level,
      matchCashback: detection.possible.includes(level),
    }),
    estimates,
  }
}

function renderCard(state: CashbackStepsState, onPickLevel = vi.fn()) {
  render(<CashbackStepsCard state={state} onPickLevel={onPickLevel} eurUsdReference={reference} />)
  return onPickLevel
}

// Money and month names the way the viewer's locale writes them, with the
// non-breaking spaces some locales use collapsed, as Testing Library does.
function money(amountMinor: number, currency = 'EUR', whole = false): string {
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency,
    ...(whole ? { minimumFractionDigits: 0, maximumFractionDigits: 0 } : {}),
  })
    .format(amountMinor / 100)
    .replace(/\s+/g, ' ')
}
const october = new Date(Date.UTC(2026, 9, 1)).toLocaleDateString(undefined, {
  month: 'long',
  timeZone: 'UTC',
})

function pill(level: string) {
  return screen.getByRole('button', { name: new RegExp(`^${level}`) })
}

describe('CashbackStepsCard', () => {
  it("shows the month's count, what's left on the step, and a pill per level", () => {
    // €200 at 3%: nothing past Core's limit yet, so every level fits
    renderCard(stateFor([purchase(20_000, 600)]))

    expect(
      screen.getByText(`≈ ${money(20_000, 'EUR', true)} counted toward the steps`),
    ).toBeInTheDocument()
    expect(
      screen.getByText(`Core: on 3%, ≈ ${money(44_000, 'EUR', true)} left before 1%.`),
    ).toBeInTheDocument()
    expect(pill('Core')).toHaveAttribute('aria-pressed', 'true')
    expect(pill('Luxe')).toHaveAttribute('aria-pressed', 'false')
    expect(pill('Core')).toHaveTextContent(`≈ ${money(600)}`)
    // every level pays 3% on the first €200
    expect(pill('Luxe')).toHaveTextContent('same')
    expect(screen.getByText(/every level pays 3% this far into/i)).toBeInTheDocument()
  })

  it('works out the level from the cashback, and shows what the others would pay', () => {
    // past €640 the rate dropped to 1%, which only Core does
    renderCard(stateFor([purchase(64_000, 1_920, 2), purchase(20_000, 200, 3)]))

    expect(pill('Core')).toHaveAttribute('aria-pressed', 'true')
    expect(pill('Core')).toHaveTextContent('detected')
    // Luxe would have paid 3% on that last €200 too: €4 more
    expect(pill('Luxe')).toHaveTextContent(`+${money(400)}`)
    expect(screen.queryByText(/can't be told/i)).not.toBeInTheDocument()
  })

  it('switches level when a pill is clicked', async () => {
    const onPickLevel = renderCard(stateFor([purchase(20_000, 600)]))

    await userEvent.click(pill('Pinnacle'))

    expect(onPickLevel).toHaveBeenCalledWith('pinnacle')
  })

  it('marks the level picked as yours, and still points out a detected one that differs', () => {
    renderCard(stateFor([purchase(64_000, 1_920, 2), purchase(20_000, 200, 3)], { saved: 'luxe' }))

    expect(pill('Luxe')).toHaveAttribute('aria-pressed', 'true')
    expect(pill('Luxe')).toHaveTextContent('your level')
    expect(pill('Core')).toHaveTextContent('detected')
    // shown on Luxe's steps from the spending alone, not pushed to where
    // Core's 1% would put it
    expect(
      screen.getByText(`≈ ${money(84_000, 'EUR', true)} counted toward the steps`),
    ).toBeInTheDocument()
    expect(screen.getByText(/fits Core, not Luxe/)).toBeInTheDocument()
  })

  it('says how a past month ended instead of what is left', () => {
    renderCard(
      stateFor([purchase(64_000, 1_920, 2), purchase(20_000, 200, 3)], {
        isCurrentMonth: false,
      }),
    )

    expect(screen.getByText(`Core: ${october} ended on 1%.`)).toBeInTheDocument()
  })

  it('says when the month has nothing in it yet, or had nothing', () => {
    const { unmount } = render(
      <CashbackStepsCard state={stateFor([])} onPickLevel={vi.fn()} eurUsdReference={reference} />,
    )
    expect(screen.getByText(`Nothing imported for ${october} yet`)).toBeInTheDocument()
    unmount()

    renderCard(stateFor([], { isCurrentMonth: false }))
    expect(screen.getByText(`No purchases in ${october}`)).toBeInTheDocument()
  })

  it('shows exact dollars, with no estimate, on the dollar ladder', () => {
    renderCard(
      stateFor([{ ...purchase(50_000, 1_500), currency: 'USD', cashbackCurrency: 'USD' }], {
        currency: 'USD',
      }),
    )

    expect(
      screen.getByText(`${money(50_000, 'USD', true)} counted toward the steps`),
    ).toBeInTheDocument()
    expect(pill('Core')).toHaveTextContent(money(1_500, 'USD'))
    expect(screen.queryByText(/an estimate: ether\.fi converts/i)).not.toBeInTheDocument()
  })
})
