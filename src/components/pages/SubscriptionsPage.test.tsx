import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { DashboardFiltersProvider } from '@/hooks/DashboardFiltersContext'
import { db } from '@/storage/db'
import { resetDatabase } from '@/storage/test-helpers'
import type { StandardTransaction } from '@/types/transaction'
import { formatUtcDate, formatUtcShortMonthLabel } from '@/utils/dates'
import { formatMoney } from '@/utils/format'
import SubscriptionsPage from './SubscriptionsPage'

// Testing Library collapses whitespace in rendered text, including the
// non-breaking spaces some locales put in money and date strings, so
// expected strings need the same treatment to match on any machine.
function normalized(text: string): string {
  return text.replace(/\s+/g, ' ')
}

function money(amountMinor: number): string {
  return normalized(formatMoney(amountMinor, 'EUR'))
}

function shortMonth(year: number, month: number): string {
  return normalized(formatUtcShortMonthLabel(year, month))
}

beforeEach(() => {
  // Only Date is faked, so "renews in N days" is stable while Dexie's own
  // timers keep running normally.
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date('2026-02-20T12:00:00.000Z'))
})

afterEach(async () => {
  vi.useRealTimers()
  await resetDatabase()
})

function makeTransaction(overrides: Partial<StandardTransaction> = {}): StandardTransaction {
  return {
    id: 'txn-1',
    cardId: 'card-1',
    timestampUtc: '2026-01-15T10:00:00.000Z',
    type: 'card_spend',
    description: 'Netflix',
    status: 'CLEARED',
    amountMinor: 1399,
    currency: 'EUR',
    originalAmountMinor: 1399,
    originalCurrency: 'EUR',
    cashbackMinor: 35,
    cashbackCurrency: 'EUR',
    categoryRaw: 'Digital Goods: Media, Books, Music',
    spendingMode: 'Direct Pay',
    identityKey: 'key-1',
    importId: 'import-1',
    ...overrides,
  }
}

function monthlyNetflix(): StandardTransaction[] {
  return [
    makeTransaction({ id: '1', timestampUtc: '2026-01-15T10:00:00.000Z' }),
    makeTransaction({ id: '2', timestampUtc: '2026-02-15T10:00:00.000Z' }),
  ]
}

function renderSubscriptionsPage() {
  return render(
    <DashboardFiltersProvider>
      <SubscriptionsPage />
    </DashboardFiltersProvider>,
  )
}

describe('SubscriptionsPage', () => {
  it('shows an import prompt instead of the list when there is no local data', async () => {
    renderSubscriptionsPage()
    expect(
      await screen.findByText(/import your etherfi export to see likely subscriptions/i),
    ).toBeInTheDocument()
  })

  it('always shows the accuracy note once there is data, with the full explanation on click', async () => {
    const user = userEvent.setup()
    await db.transactions.put(makeTransaction())

    renderSubscriptionsPage()

    expect(
      await screen.findByText(/these are patterns we spotted, not confirmed subscriptions/i),
    ).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'How we detect these' }))

    const explanation = await screen.findByRole('dialog')
    expect(
      within(explanation).getByText(/exact same amount on the same day of the month/i),
    ).toBeInTheDocument()
    expect(within(explanation).getByText(/period filter doesn't apply/i)).toBeInTheDocument()
  })

  it('lists a merchant that charged the same amount on the same day of the month at least twice', async () => {
    await db.transactions.bulkPut(monthlyNetflix())

    renderSubscriptionsPage()

    const list = await screen.findByRole('region', { name: 'Active subscriptions' })
    expect(within(list).getByText('Netflix')).toBeInTheDocument()
    expect(within(list).getByText('Media, Books, Music', { exact: false })).toBeInTheDocument()
    // rendered twice: once in the phone layout, once in the wider one
    expect(within(list).getAllByText('Renews in 23 days')).toHaveLength(2)
    expect(within(list).getByText(money(2798))).toBeInTheDocument()
    expect(within(list).getByText(`since ${shortMonth(2026, 1)}`)).toBeInTheDocument()
    expect(
      within(list).getByRole('img', { name: 'Charged in 2 of the last 12 months' }),
    ).toBeInTheDocument()
  })

  it('sums the active subscriptions into the summary cards', async () => {
    await db.transactions.bulkPut([
      ...monthlyNetflix(),
      makeTransaction({
        id: '3',
        description: 'Spotify',
        amountMinor: 1099,
        timestampUtc: '2026-01-19T10:00:00.000Z',
      }),
      makeTransaction({
        id: '4',
        description: 'Spotify',
        amountMinor: 1099,
        timestampUtc: '2026-02-19T10:00:00.000Z',
      }),
    ])

    renderSubscriptionsPage()

    expect(await screen.findByText(money(1399 + 1099))).toBeInTheDocument()
    expect(screen.getByText('2 active subscriptions')).toBeInTheDocument()
    expect(screen.getByText(money((1399 + 1099) * 12))).toBeInTheDocument()
    // Netflix renews on Mar 15, before Spotify on Mar 19
    expect(screen.getByText(`${money(1399)} in 23 days`)).toBeInTheDocument()
  })

  it('expands to list each underlying charge, collapsed by default', async () => {
    const user = userEvent.setup()
    await db.cards.put({ id: 'card-1', last4: '4242', cardHolderKey: 'jane doe', label: 'Card' })
    await db.transactions.bulkPut(monthlyNetflix())

    renderSubscriptionsPage()
    const list = await screen.findByRole('region', { name: 'Active subscriptions' })

    const januaryDate = normalized(formatUtcDate('2026-01-15T10:00:00.000Z'))
    const februaryDate = normalized(formatUtcDate('2026-02-15T10:00:00.000Z'))
    expect(within(list).getByText(januaryDate)).not.toBeVisible()

    await user.click(within(list).getByText('Netflix'))

    expect(within(list).getByText(januaryDate)).toBeVisible()
    expect(within(list).getByText(februaryDate)).toBeVisible()
    expect(within(list).getAllByText('•••• 4242')).toHaveLength(2)
    expect(within(list).getByText(/day 15 of the month/i)).toBeVisible()
  })

  it('moves a subscription with no charge in the last 35 days into its own section, left out of the totals', async () => {
    await db.transactions.bulkPut([
      ...monthlyNetflix(),
      makeTransaction({
        id: '3',
        description: 'Disney+',
        amountMinor: 899,
        timestampUtc: '2025-10-14T10:00:00.000Z',
      }),
      makeTransaction({
        id: '4',
        description: 'Disney+',
        amountMinor: 899,
        timestampUtc: '2025-11-14T10:00:00.000Z',
      }),
    ])

    renderSubscriptionsPage()

    const activeList = await screen.findByRole('region', { name: 'Active subscriptions' })
    expect(within(activeList).queryByText('Disney+')).not.toBeInTheDocument()

    const stopped = screen.getByRole('group', { name: 'No recent charge' })
    expect(within(stopped).getByText('No recent charge')).toBeInTheDocument()
    expect(within(stopped).getByText('Disney+')).toBeInTheDocument()
    expect(within(stopped).getAllByText(`Last charged ${shortMonth(2025, 11)}`)).toHaveLength(2)

    expect(screen.getByText('1 active subscription')).toBeInTheDocument()
    expect(screen.getAllByText(money(1399)).length).toBeGreaterThanOrEqual(1)
    expect(screen.queryByText(money(1399 + 899))).not.toBeInTheDocument()
  })

  it('shows an empty state instead of a false positive when nothing repeats', async () => {
    await db.transactions.put(makeTransaction())

    renderSubscriptionsPage()

    expect(await screen.findByText(/no repeating charges found yet/i)).toBeInTheDocument()
    expect(screen.queryByText('Netflix')).not.toBeInTheDocument()
  })

  it('does not mix a subscription found in one currency into another', async () => {
    await db.transactions.bulkPut([
      makeTransaction({ id: '1', timestampUtc: '2026-01-15T10:00:00.000Z', currency: 'EUR' }),
      makeTransaction({ id: '2', timestampUtc: '2026-02-15T10:00:00.000Z', currency: 'EUR' }),
      makeTransaction({
        id: '3',
        description: 'Only in USD',
        currency: 'USD',
        timestampUtc: '2026-01-20T10:00:00.000Z',
      }),
    ])

    renderSubscriptionsPage()

    // defaults to the first currency in sorted order (EUR)
    const list = await screen.findByRole('region', { name: 'Active subscriptions' })
    expect(within(list).getByText('Netflix')).toBeInTheDocument()
    expect(screen.queryByText('Only in USD')).not.toBeInTheDocument()
  })
})
