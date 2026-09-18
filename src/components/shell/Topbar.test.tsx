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
    expect(screen.getByRole('link', { name: /import transactions/i })).toHaveAttribute(
      'href',
      '/app/import',
    )
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

    expect(await screen.findByRole('combobox', { name: 'Currency' })).toHaveTextContent('EUR')
    expect(screen.getByRole('combobox', { name: 'Card' })).toHaveTextContent('All cards')
    expect(screen.getByRole('combobox', { name: 'Period' })).toHaveTextContent(
      formatUtcMonthLabel(2026, 3),
    )
  })

  it('lets the card filter be changed to a specific card', async () => {
    await db.cards.put({ id: 'card-1', last4: '1234', cardHolderKey: 'jane doe', label: 'Card A' })
    await db.transactions.put(makeTransaction())

    const user = userEvent.setup()
    renderAt('/app')

    const cardSelect = await screen.findByRole('combobox', { name: 'Card' })
    await user.click(cardSelect)
    await user.click(await screen.findByRole('option', { name: 'Card A' }))

    expect(cardSelect).toHaveTextContent('Card A')
  })
})
