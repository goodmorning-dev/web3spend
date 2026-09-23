import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
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

function renderTransactionsPage() {
  return render(
    <DashboardFiltersProvider>
      <TransactionsPage />
    </DashboardFiltersProvider>,
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
    await user.type(screen.getByRole('textbox', { name: /search by merchant/i }), 'coffee')

    expect(screen.getAllByText('Coffee Shop')).toHaveLength(2)
    expect(screen.queryByText('Grocery Run')).not.toBeInTheDocument()
  })
})
