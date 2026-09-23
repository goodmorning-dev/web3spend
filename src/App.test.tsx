import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it } from 'vitest'
import { db } from '@/storage/db'
import { resetDatabase } from '@/storage/test-helpers'
import App from './App'

afterEach(resetDatabase)

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  )
}

describe('App routing', () => {
  it('redirects the root path to /home', () => {
    renderAt('/')
    expect(
      screen.getByRole('heading', { name: /your spending/i, level: 1 }),
    ).toBeInTheDocument()
  })

  it('renders Home at /home', () => {
    renderAt('/home')
    expect(
      screen.getByRole('heading', { name: /your spending/i, level: 1 }),
    ).toBeInTheDocument()
  })

  it('renders the app shell with the Dashboard at /app', async () => {
    renderAt('/app')
    expect(
      await screen.findByRole('heading', { name: /import your ether\.fi data/i }),
    ).toBeInTheDocument()
    // the shell (sidebar nav) renders alongside the page content; "Transactions"
    // (exact) is the sidebar link, distinct from the topbar's "Import transactions"
    const sidebar = screen.getByRole('navigation', { name: 'Sidebar' })
    expect(within(sidebar).getByRole('link', { name: 'Transactions' })).toBeInTheDocument()
    expect(screen.getByRole('navigation', { name: 'Tab bar' })).toBeInTheDocument()
  })

  it('renders the Transactions page within the shell at /app/transactions', async () => {
    renderAt('/app/transactions')
    // the page title comes from Topbar; the page itself has no second,
    // duplicate heading of its own
    expect(
      await screen.findByRole('heading', { name: 'Transactions', level: 2 }),
    ).toBeInTheDocument()
    const sidebar = screen.getByRole('navigation', { name: 'Sidebar' })
    expect(within(sidebar).getByRole('link', { name: /dashboard/i })).toBeInTheDocument()
  })

  it('renders the Subscriptions page within the shell at /app/subscriptions', async () => {
    renderAt('/app/subscriptions')
    expect(
      await screen.findByRole('heading', { name: 'Subscriptions', level: 2 }),
    ).toBeInTheDocument()
    expect(
      await screen.findByText(/import your ether\.fi export to see likely subscriptions/i),
    ).toBeInTheDocument()
  })

  it('renders the Import page within the shell at /app/import', async () => {
    renderAt('/app/import')
    expect(
      await screen.findByRole('heading', { name: /import your ether\.fi data/i }),
    ).toBeInTheDocument()
    expect(screen.getByLabelText(/choose an xlsx file/i)).toBeInTheDocument()
  })

  it('renders the Settings page within the shell at /app/settings', async () => {
    renderAt('/app/settings')
    // the page title comes from Topbar; the page itself has no second,
    // duplicate heading of its own
    expect(await screen.findByRole('heading', { name: 'Settings', level: 2 })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /delete all data/i })).toBeInTheDocument()
  })

  it('redirects an unknown path to /home', () => {
    renderAt('/something-that-does-not-exist')
    expect(
      screen.getByRole('heading', { name: /your spending/i, level: 1 }),
    ).toBeInTheDocument()
  })

  async function seedOneTransaction() {
    await db.cards.put({
      id: 'card-1',
      last4: '1234',
      cardHolderKey: 'jane doe',
      label: 'Card ****1234',
    })
    await db.transactions.put({
      id: 'txn-1',
      cardId: 'card-1',
      timestampUtc: '2026-01-05T00:00:00.000Z',
      type: 'card_spend',
      description: 'A',
      status: 'CLEARED',
      amountMinor: 100,
      currency: 'EUR',
      originalAmountMinor: 100,
      originalCurrency: 'EUR',
      cashbackMinor: 1,
      cashbackCurrency: 'EUR',
      categoryRaw: 'Cat',
      spendingMode: 'Direct Pay',
      identityKey: 'k1',
      importId: 'import-1',
    })
    await db.imports.put({
      id: 'import-1',
      fileHash: 'hash',
      importedAt: '2026-01-06T00:00:00.000Z',
      parserVersion: '1',
      rowCounts: { added: 1, updated: 0, unsupported: 0 },
    })
  }

  it('clicking a day on the Dashboard heatmap navigates to Transactions (MVP-PLAN §5)', async () => {
    const user = userEvent.setup()
    await seedOneTransaction()

    renderAt('/app')
    await screen.findByRole('grid', { name: /calendar heatmap/i })

    const cell = screen.getByRole('gridcell', { name: /^2026-01-05:/ })
    await user.click(cell)

    expect(
      await screen.findByRole('heading', { name: 'Transactions', level: 2 }),
    ).toBeInTheDocument()
  })

  it('selecting a heatmap day by keyboard also navigates to Transactions', async () => {
    const user = userEvent.setup()
    await seedOneTransaction()

    renderAt('/app')
    const grid = await screen.findByRole('grid', { name: /calendar heatmap/i })
    grid.focus()
    await user.keyboard('{Enter}')

    expect(
      await screen.findByRole('heading', { name: 'Transactions', level: 2 }),
    ).toBeInTheDocument()
  })

  async function seedMultiDayMultiCurrency() {
    await db.cards.put({
      id: 'card-1',
      last4: '1234',
      cardHolderKey: 'jane doe',
      label: 'Card ****1234',
    })
    await db.transactions.bulkPut([
      {
        id: 'target-day',
        cardId: 'card-1',
        timestampUtc: '2026-01-05T00:00:00.000Z',
        type: 'card_spend',
        description: 'Coffee on the target day',
        status: 'CLEARED',
        amountMinor: 450,
        currency: 'EUR',
        originalAmountMinor: 450,
        originalCurrency: 'EUR',
        cashbackMinor: 9,
        cashbackCurrency: 'EUR',
        categoryRaw: 'Cat',
        spendingMode: 'Direct Pay',
        identityKey: 'k1',
        importId: 'import-1',
      },
      {
        id: 'other-day',
        cardId: 'card-1',
        timestampUtc: '2026-01-10T00:00:00.000Z',
        type: 'card_spend',
        description: 'Groceries on a different day',
        status: 'CLEARED',
        amountMinor: 2000,
        currency: 'EUR',
        originalAmountMinor: 2000,
        originalCurrency: 'EUR',
        cashbackMinor: 40,
        cashbackCurrency: 'EUR',
        categoryRaw: 'Cat',
        spendingMode: 'Direct Pay',
        identityKey: 'k2',
        importId: 'import-1',
      },
      {
        id: 'same-day-other-currency',
        cardId: 'card-1',
        timestampUtc: '2026-01-05T12:00:00.000Z',
        type: 'card_spend',
        description: 'USD purchase on the target day',
        status: 'CLEARED',
        amountMinor: 500,
        currency: 'USD',
        originalAmountMinor: 500,
        originalCurrency: 'USD',
        cashbackMinor: 10,
        cashbackCurrency: 'USD',
        categoryRaw: 'Cat',
        spendingMode: 'Direct Pay',
        identityKey: 'k3',
        importId: 'import-1',
      },
    ])
    await db.imports.put({
      id: 'import-1',
      fileHash: 'hash',
      importedAt: '2026-01-11T00:00:00.000Z',
      parserVersion: '1',
      rowCounts: { added: 3, updated: 0, unsupported: 0 },
    })
  }

  it("clicking a heatmap day shows only that day's transactions, respecting the currency filter, with a visible way to clear it (MVP-PLAN §5)", async () => {
    const user = userEvent.setup()
    await seedMultiDayMultiCurrency()

    renderAt('/app')
    await screen.findByRole('grid', { name: /calendar heatmap/i })

    const targetCell = screen.getByRole('gridcell', { name: /^2026-01-05:/ })
    await user.click(targetCell)

    // each transaction row renders twice: once in the mobile receipt list,
    // once in the desktop table, only one of which is visible at a given
    // viewport width
    await screen.findByRole('heading', { name: 'Transactions', level: 2 })
    expect(screen.getAllByText('Coffee on the target day')).toHaveLength(2)
    expect(screen.queryByText('Groceries on a different day')).not.toBeInTheDocument()
    // same calendar day, but a different currency than the selected EUR filter
    expect(screen.queryByText('USD purchase on the target day')).not.toBeInTheDocument()

    const dayChip = screen.getByText(/^Day: /)
    expect(dayChip).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /clear day filter/i }))

    expect(screen.queryByText(/^Day: /)).not.toBeInTheDocument()
    expect(screen.getAllByText('Coffee on the target day')).toHaveLength(2)
    expect(screen.getAllByText('Groceries on a different day')).toHaveLength(2)
  })

  it('selecting a day by keyboard also narrows the transaction list to it', async () => {
    const user = userEvent.setup()
    await seedMultiDayMultiCurrency()

    renderAt('/app')
    const grid = await screen.findByRole('grid', { name: /calendar heatmap/i })
    grid.focus()
    // Jan 1, 2026 (index 0) is a Thursday; four ArrowDown presses move to
    // index 4, Jan 5, without crossing into a new week column.
    await user.keyboard('{ArrowDown}{ArrowDown}{ArrowDown}{ArrowDown}{Enter}')

    await screen.findByRole('heading', { name: 'Transactions', level: 2 })
    expect(screen.getAllByText('Coffee on the target day')).toHaveLength(2)
    expect(screen.queryByText('Groceries on a different day')).not.toBeInTheDocument()
  })
})
