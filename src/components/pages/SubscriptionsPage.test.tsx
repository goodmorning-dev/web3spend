import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'
import { DashboardFiltersProvider } from '@/hooks/DashboardFiltersContext'
import { db } from '@/storage/db'
import { resetDatabase } from '@/storage/test-helpers'
import type { StandardTransaction } from '@/types/transaction'
import { formatUtcDate } from '@/utils/dates'
import SubscriptionsPage from './SubscriptionsPage'

afterEach(resetDatabase)

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

  it('always shows the accuracy disclaimer once there is data', async () => {
    await db.transactions.put(makeTransaction())

    renderSubscriptionsPage()

    expect(await screen.findByText(/these are guesses, not confirmed subscriptions/i)).toBeInTheDocument()
  })

  it('lists a merchant that charged the same amount on the same day of the month at least twice', async () => {
    await db.transactions.bulkPut([
      makeTransaction({ id: '1', timestampUtc: '2026-01-15T10:00:00.000Z' }),
      makeTransaction({ id: '2', timestampUtc: '2026-02-15T10:00:00.000Z' }),
    ])

    renderSubscriptionsPage()

    expect(await screen.findByText('Netflix')).toBeInTheDocument()
    // the amount also appears once per occurrence row inside the (collapsed)
    // expanded list, so there are two matches once cards are seeded above
    expect(screen.getAllByText('€13.99').length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText(/day 15 of the month/i)).toBeInTheDocument()
    expect(screen.getByText(/2 charges/i)).toBeInTheDocument()
  })

  it('expands to list each underlying charge, collapsed by default', async () => {
    const user = userEvent.setup()
    await db.cards.put({ id: 'card-1', last4: '4242', cardHolderKey: 'jane doe', label: 'Card' })
    await db.transactions.bulkPut([
      makeTransaction({ id: '1', cardId: 'card-1', timestampUtc: '2026-01-15T10:00:00.000Z' }),
      makeTransaction({ id: '2', cardId: 'card-1', timestampUtc: '2026-02-15T10:00:00.000Z' }),
    ])

    renderSubscriptionsPage()
    await screen.findByText('Netflix')

    const januaryDate = formatUtcDate('2026-01-15T10:00:00.000Z')
    const februaryDate = formatUtcDate('2026-02-15T10:00:00.000Z')
    expect(screen.getByText(januaryDate)).not.toBeVisible()

    await user.click(screen.getByText('Netflix'))

    expect(screen.getByText(januaryDate)).toBeVisible()
    expect(screen.getByText(februaryDate)).toBeVisible()
    expect(screen.getAllByText('•••• 4242')).toHaveLength(2)
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
    expect(await screen.findByText('Netflix')).toBeInTheDocument()
    expect(screen.queryByText('Only in USD')).not.toBeInTheDocument()
  })
})
