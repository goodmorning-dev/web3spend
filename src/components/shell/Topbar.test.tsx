import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it } from 'vitest'
import { db } from '@/storage/db'
import { resetDatabase } from '@/storage/test-helpers'
import { DashboardFiltersProvider } from '@/hooks/DashboardFiltersContext'
import { formatUtcMonthLabel } from '@/utils/dates'
import type { StandardTransaction } from '@/types/transaction'
import Topbar from './Topbar'

afterEach(resetDatabase)

function makeTransaction(overrides: Partial<StandardTransaction> = {}): StandardTransaction {
  return {
    id: 'txn-1',
    cardId: 'card-1',
    timestampUtc: '2026-03-15T10:00:00.000Z',
    type: 'card_spend',
    description: 'Coffee Shop',
    status: 'CLEARED',
    amountMinor: 450,
    currency: 'EUR',
    originalAmountMinor: 450,
    originalCurrency: 'EUR',
    cashbackMinor: 9,
    cashbackCurrency: 'EUR',
    categoryRaw: 'Groceries',
    spendingMode: 'Direct Pay',
    identityKey: 'key-1',
    importId: 'import-1',
    ...overrides,
  }
}

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <DashboardFiltersProvider>
        <Topbar />
      </DashboardFiltersProvider>
    </MemoryRouter>,
  )
}

describe('Topbar', () => {
  it('shows the page title for the current route', () => {
    renderAt('/app/transactions')
    expect(screen.getByRole('heading', { name: 'Transactions' })).toBeInTheDocument()
  })

  it('always shows the privacy chip and the import button', () => {
    renderAt('/app')
    expect(screen.getByText(/processed on your device/i)).toBeInTheDocument()
    // rendered twice: once in the mobile layout, once in the desktop layout,
    // only one of which is visible at a given viewport width
    const importLinks = screen.getAllByRole('link', { name: /import transactions/i })
    expect(importLinks).toHaveLength(2)
    for (const link of importLinks) {
      expect(link).toHaveAttribute('href', '/app/import')
    }
  })

  it('hides the filter dropdowns when there is no data to filter', () => {
    renderAt('/app')
    expect(screen.queryByRole('combobox', { name: 'Currency' })).not.toBeInTheDocument()
    expect(screen.queryByRole('combobox', { name: 'Card' })).not.toBeInTheDocument()
    expect(screen.queryByRole('combobox', { name: 'Period' })).not.toBeInTheDocument()
  })

  it('shows the filters, defaulted from the data, once transactions exist', async () => {
    await db.transactions.put(makeTransaction())

    renderAt('/app')

    // rendered twice: once in the mobile layout, once in the desktop layout,
    // only one of which is visible at a given viewport width
    const currencySelects = await screen.findAllByRole('combobox', { name: 'Currency' })
    expect(currencySelects).toHaveLength(2)
    for (const select of currencySelects) {
      expect(select).toHaveTextContent('EUR')
    }
    const cardSelects = screen.getAllByRole('combobox', { name: 'Card' })
    expect(cardSelects).toHaveLength(2)
    for (const select of cardSelects) {
      expect(select).toHaveTextContent('All cards')
    }
    const periodSelects = screen.getAllByRole('combobox', { name: 'Period' })
    expect(periodSelects).toHaveLength(2)
    for (const select of periodSelects) {
      expect(select).toHaveTextContent(formatUtcMonthLabel(2026, 3))
    }
  })

  it('leaves out the period filter on Subscriptions, which always uses the full history', async () => {
    await db.transactions.put(makeTransaction())

    renderAt('/app/subscriptions')

    expect(await screen.findAllByRole('combobox', { name: 'Currency' })).toHaveLength(2)
    expect(screen.getAllByRole('combobox', { name: 'Card' })).toHaveLength(2)
    expect(screen.queryByRole('combobox', { name: 'Period' })).not.toBeInTheDocument()
  })

  it('lets the card filter be changed to a specific card', async () => {
    await db.cards.put({ id: 'card-1', last4: '1234', cardHolderKey: 'jane doe', label: 'Card A' })
    await db.transactions.put(makeTransaction())

    const user = userEvent.setup()
    renderAt('/app')

    // both layouts render a "Card" combobox; only one is visible/interactive
    // at the jsdom viewport, so pick the first that userEvent can actually click
    const [cardSelect] = await screen.findAllByRole('combobox', { name: 'Card' })
    await user.click(cardSelect)
    await user.click(await screen.findByRole('option', { name: 'Card A' }))

    expect(cardSelect).toHaveTextContent('Card A')
  })
})
