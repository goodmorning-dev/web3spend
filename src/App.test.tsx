import { render, screen } from '@testing-library/react'
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
    expect(screen.getByRole('heading', { name: 'Web3Spend' })).toBeInTheDocument()
  })

  it('renders Home at /home', () => {
    renderAt('/home')
    expect(screen.getByRole('heading', { name: 'Web3Spend' })).toBeInTheDocument()
  })

  it('renders the app shell with the Dashboard at /app', async () => {
    renderAt('/app')
    expect(
      await screen.findByRole('heading', { name: /import your etherfi export/i }),
    ).toBeInTheDocument()
    // the shell (sidebar nav) renders alongside the page content; "Transactions"
    // (exact) is the sidebar link, distinct from the topbar's "Import transactions"
    expect(screen.getByRole('link', { name: 'Transactions' })).toBeInTheDocument()
  })

  it('renders the Transactions page within the shell at /app/transactions', async () => {
    renderAt('/app/transactions')
    // both the topbar title and the page's own heading say "Transactions";
    // the page heading is the h1
    expect(
      await screen.findByRole('heading', { name: 'Transactions', level: 1 }),
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /dashboard/i })).toBeInTheDocument()
  })

  it('renders the Import page within the shell at /app/import', async () => {
    renderAt('/app/import')
    expect(
      await screen.findByRole('heading', { name: /import your etherfi export/i }),
    ).toBeInTheDocument()
    expect(screen.getByLabelText(/choose an xlsx file/i)).toBeInTheDocument()
  })

  it('redirects an unknown path to /home', () => {
    renderAt('/something-that-does-not-exist')
    expect(screen.getByRole('heading', { name: 'Web3Spend' })).toBeInTheDocument()
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
      await screen.findByRole('heading', { name: 'Transactions', level: 1 }),
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
      await screen.findByRole('heading', { name: 'Transactions', level: 1 }),
    ).toBeInTheDocument()
  })
})
