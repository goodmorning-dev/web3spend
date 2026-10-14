import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it } from 'vitest'
import TransactionsPage from '@/components/pages/TransactionsPage'
import { DashboardFiltersProvider } from '@/hooks/DashboardFiltersContext'
import { listCategoryRules } from '@/storage/categories'
import { db } from '@/storage/db'
import { resetDatabase } from '@/storage/test-helpers'
import type { StandardTransaction } from '@/types/transaction'

afterEach(resetDatabase)

function makeTransaction(overrides: Partial<StandardTransaction> = {}): StandardTransaction {
  return {
    id: 'txn-1',
    cardId: 'card-1',
    timestampUtc: '2026-03-01T10:00:00.000Z',
    type: 'card_spend',
    description: 'Steam Purchase',
    status: 'CLEARED',
    amountMinor: 1000,
    currency: 'EUR',
    originalAmountMinor: 1000,
    originalCurrency: 'EUR',
    cashbackMinor: 30,
    cashbackCurrency: 'EUR',
    categoryRaw: 'Digital Goods: Games',
    spendingMode: 'Direct Pay',
    identityKey: 'key-1',
    importId: 'import-1',
    ...overrides,
  }
}

async function seed(transactions: StandardTransaction[]) {
  await db.cards.put({ id: 'card-1', last4: '1234', cardHolderKey: 'jane doe', label: 'Card' })
  await db.transactions.bulkPut(transactions)
}

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/app/transactions']}>
      <DashboardFiltersProvider>
        <TransactionsPage />
      </DashboardFiltersProvider>
    </MemoryRouter>,
  )
}

/** Each row renders twice (phone list and desktop table); either button
 * opens the same dialog. */
async function openCategory(user: ReturnType<typeof userEvent.setup>, merchant: string) {
  const [button] = await screen.findAllByRole('button', {
    name: `Change the category of ${merchant}`,
  })
  await user.click(button)
  return screen.findByRole('dialog')
}

describe("changing a transaction's category", () => {
  it('files a purchase under a new category, with a rule that moves the same merchant too', async () => {
    await seed([
      makeTransaction(),
      makeTransaction({
        id: 'txn-2',
        identityKey: 'key-2',
        timestampUtc: '2026-03-02T10:00:00.000Z',
      }),
      makeTransaction({ id: 'txn-3', identityKey: 'key-3', description: 'skin.club' }),
    ])
    const user = userEvent.setup()
    renderPage()

    const dialog = await openCategory(user, 'Steam Purchase')
    await user.selectOptions(within(dialog).getByLabelText('Category'), 'new')
    await user.type(within(dialog).getByLabelText('New category name'), 'Gaming')
    await user.click(within(dialog).getByLabelText(/always use this for steam purchase/i))
    await user.click(within(dialog).getByRole('button', { name: 'Save' }))

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    // both Steam purchases, in both layouts
    expect(await screen.findAllByRole('button', { name: 'Gaming' })).toHaveLength(4)
    expect(screen.getAllByRole('button', { name: 'Digital Goods: Games' })).toHaveLength(2)
    expect(await listCategoryRules()).toMatchObject([{ kind: 'merchant', label: 'Steam Purchase' }])
  })

  it('offers only the category: no amount, cashback, date or status to change', async () => {
    await seed([makeTransaction()])
    const user = userEvent.setup()
    renderPage()

    const dialog = await openCategory(user, 'Steam Purchase')

    expect(within(dialog).getByLabelText('Category')).toBeInTheDocument()
    for (const label of [/amount/i, /cashback/i, /date/i, /status/i, /merchant/i]) {
      expect(within(dialog).queryByLabelText(label)).not.toBeInTheDocument()
    }
    expect(within(dialog).queryByRole('button', { name: /delete/i })).not.toBeInTheDocument()
  })

  it('has no way to add a purchase by hand', async () => {
    await seed([makeTransaction()])
    renderPage()

    await screen.findAllByRole('button', { name: 'Change the category of Steam Purchase' })
    expect(screen.queryByRole('button', { name: /add transaction/i })).not.toBeInTheDocument()
  })

  it('can still undo an edit made before amounts stopped being editable', async () => {
    await seed([
      makeTransaction({
        amountMinor: 1250,
        editedFields: ['amountMinor'],
        importedValues: { amountMinor: 1000 },
      }),
    ])
    const user = userEvent.setup()
    renderPage()

    expect(await screen.findAllByText('Edited')).toHaveLength(2)
    const dialog = await openCategory(user, 'Steam Purchase')
    await user.click(within(dialog).getByRole('button', { name: /undo my edits/i }))

    await waitFor(() => expect(screen.queryByText('Edited')).not.toBeInTheDocument())
    expect((await db.transactions.get('txn-1'))?.amountMinor).toBe(1000)
  })

  it('can still delete a purchase that was added by hand before', async () => {
    await seed([
      makeTransaction(),
      makeTransaction({
        id: 'manual-1',
        identityKey: 'manual:manual-1',
        importId: 'manual',
        source: 'manual',
        description: 'Farmers market',
        timestampUtc: '2026-03-05T10:00:00.000Z',
      }),
    ])
    const user = userEvent.setup()
    renderPage()

    expect(await screen.findAllByText('Manual')).toHaveLength(2)
    const dialog = await openCategory(user, 'Farmers market')
    await user.click(within(dialog).getByRole('button', { name: 'Delete' }))
    await user.click(within(dialog).getByRole('button', { name: /yes, delete it/i }))

    await waitFor(() => expect(screen.queryByText('Farmers market')).not.toBeInTheDocument())
    expect(await db.transactions.count()).toBe(1)
  })
})
