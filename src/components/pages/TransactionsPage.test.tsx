import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it } from 'vitest'
import { DashboardFiltersProvider } from '@/hooks/DashboardFiltersContext'
import { db } from '@/storage/db'
import { resetDatabase } from '@/storage/test-helpers'
import type { StandardTransaction } from '@/types/transaction'
import TransactionsPage from './TransactionsPage'

afterEach(resetDatabase)

function makeTransaction(overrides: Partial<StandardTransaction> = {}): StandardTransaction {
  return {
    id: 'txn-1',
    cardId: 'card-1',
    timestampUtc: '2026-03-01T00:00:00.000Z',
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

function renderTransactionsPage(path = '/app/transactions') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <DashboardFiltersProvider>
        <TransactionsPage />
      </DashboardFiltersProvider>
    </MemoryRouter>,
  )
}

describe('TransactionsPage', () => {
  it('shows an import prompt instead of a table when there is no local data', async () => {
    renderTransactionsPage()
    // no page-level heading here: the page title comes from Topbar (AppShell),
    // so a second one on the page itself would just duplicate it on screen.
    expect(await screen.findByText(/import your ether\.fi export/i)).toBeInTheDocument()
  })

  it('lists the transactions in the default period and narrows them by search', async () => {
    await db.cards.put({
      id: 'card-1',
      last4: '1234',
      cardHolderKey: 'jane doe',
      label: 'Card ****1234',
    })
    await db.transactions.bulkPut([
      makeTransaction({ id: 'txn-1', description: 'Coffee Shop' }),
      makeTransaction({ id: 'txn-2', description: 'Grocery Run', categoryRaw: 'Food' }),
    ])
    await db.imports.put({
      id: 'import-1',
      fileHash: 'hash',
      importedAt: '2026-03-02T00:00:00.000Z',
      parserVersion: '1',
      rowCounts: { added: 2, updated: 0, unsupported: 0 },
    })

    renderTransactionsPage()

    // each transaction renders twice: once in the mobile receipt list, once
    // in the desktop table, only one of which is visible at a given width
    expect(await screen.findAllByText('Coffee Shop')).toHaveLength(2)
    expect(screen.getAllByText('Grocery Run')).toHaveLength(2)

    const user = userEvent.setup()
    const search = screen.getByRole('textbox', { name: /search by merchant/i })
    await user.type(search, 'coffee')

    expect(screen.getAllByText('Coffee Shop')).toHaveLength(2)
    expect(screen.queryByText('Grocery Run')).not.toBeInTheDocument()
    // leaving this focused confuses a Select in a later test's focus
    // handling once this input is unmounted (see src/test/setup.ts)
    search.blur()
  })

  it('opens with the category from the URL already filtered, as the Dashboard links to it', async () => {
    await db.transactions.bulkPut([
      makeTransaction({ id: 'txn-1', description: 'Coffee Shop', categoryRaw: 'Groceries' }),
      makeTransaction({ id: 'txn-2', description: 'Taxi Ride', categoryRaw: '4121 - Taxicabs' }),
    ])

    renderTransactionsPage('/app/transactions?category=taxicabs')

    expect(await screen.findAllByText('Taxi Ride')).toHaveLength(2)
    expect(screen.queryByText('Coffee Shop')).not.toBeInTheDocument()
    for (const select of screen.getAllByRole('combobox', { name: /category/i })) {
      expect(select).toHaveTextContent('Taxicabs')
    }
  })

  it('narrows the list to Borrow Mode or Direct Pay purchases', async () => {
    await db.transactions.bulkPut([
      makeTransaction({ id: 'txn-1', description: 'Coffee Shop' }),
      makeTransaction({ id: 'txn-2', description: 'Flight', spendingMode: 'Borrow Mode' }),
    ])
    const user = userEvent.setup()

    renderTransactionsPage()
    expect(await screen.findAllByText('Coffee Shop')).toHaveLength(2)

    const [modeSelect] = screen.getAllByRole('combobox', { name: 'Spending mode' })
    await user.click(modeSelect)
    await user.click(await screen.findByRole('option', { name: 'Borrow' }))

    expect(screen.getAllByText('Flight')).toHaveLength(2)
    expect(screen.queryByText('Coffee Shop')).not.toBeInTheDocument()
    expect(screen.getByText('1 transaction found')).toBeInTheDocument()
    // the Select hands focus back to its trigger; see the search test above
    modeSelect.blur()
  })

  it('offers only the spending modes that are actually there', async () => {
    await db.transactions.bulkPut([makeTransaction({ id: 'txn-1', description: 'Coffee Shop' })])
    const user = userEvent.setup()

    renderTransactionsPage()
    await screen.findAllByText('Coffee Shop')

    const [modeSelect] = screen.getAllByRole('combobox', { name: 'Spending mode' })
    await user.click(modeSelect)

    expect(await screen.findByRole('option', { name: 'Direct' })).toBeInTheDocument()
    expect(screen.queryByRole('option', { name: 'Borrow' })).not.toBeInTheDocument()
    await user.keyboard('{Escape}')
    modeSelect.blur()
  })
})
