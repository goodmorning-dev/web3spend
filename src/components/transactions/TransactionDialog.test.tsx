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

/** Each row renders twice (phone list and desktop table); either edit
 * button opens the same dialog. */
async function openEditor(user: ReturnType<typeof userEvent.setup>, merchant: string) {
  const [button] = await screen.findAllByRole('button', { name: `Edit ${merchant}` })
  await user.click(button)
  return screen.findByRole('dialog')
}

describe('editing and adding transactions', () => {
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

    const [firstEdit] = await screen.findAllByRole('button', { name: 'Edit Steam Purchase' })
    await user.click(firstEdit)
    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByLabelText('Merchant')).toHaveValue('Steam Purchase')

    await user.selectOptions(within(dialog).getByLabelText('Category'), 'new')
    await user.type(within(dialog).getByLabelText('New category name'), 'Gaming')
    await user.click(within(dialog).getByLabelText(/always use this for steam purchase/i))
    await user.click(within(dialog).getByRole('button', { name: 'Save changes' }))

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    // both Steam purchases, in both layouts
    expect(await screen.findAllByRole('button', { name: 'Gaming' })).toHaveLength(4)
    expect(screen.getAllByRole('button', { name: 'Digital Goods: Games' })).toHaveLength(2)
    expect(await listCategoryRules()).toMatchObject([{ kind: 'merchant', label: 'Steam Purchase' }])
  })

  it('saves an edit to an imported purchase, marks it, and can undo it', async () => {
    await seed([makeTransaction()])
    const user = userEvent.setup()
    renderPage()

    let dialog = await openEditor(user, 'Steam Purchase')
    const amount = within(dialog).getByLabelText('Amount (EUR)')
    expect(amount).toHaveValue('10.00')
    await user.clear(amount)
    await user.type(amount, '12,5')
    await user.click(within(dialog).getByRole('button', { name: 'Save changes' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())

    expect(await screen.findAllByText('Edited')).toHaveLength(2)
    expect((await db.transactions.get('txn-1'))?.amountMinor).toBe(1250)

    dialog = await openEditor(user, 'Steam Purchase')
    await user.click(within(dialog).getByRole('button', { name: /undo my edits/i }))
    await waitFor(() => expect(screen.queryByText('Edited')).not.toBeInTheDocument())
    expect((await db.transactions.get('txn-1'))?.amountMinor).toBe(1000)
  })

  it('refuses an amount it would have to round', async () => {
    await seed([makeTransaction()])
    const user = userEvent.setup()
    renderPage()

    const dialog = await openEditor(user, 'Steam Purchase')
    const amount = within(dialog).getByLabelText('Amount (EUR)')
    await user.clear(amount)
    await user.type(amount, '10.005')
    await user.click(within(dialog).getByRole('button', { name: 'Save changes' }))

    expect(within(dialog).getByRole('alert')).toHaveTextContent(/up to two decimals/i)
    expect((await db.transactions.get('txn-1'))?.amountMinor).toBe(1000)
  })

  it('adds a purchase by hand, then deletes it again', async () => {
    await seed([makeTransaction()])
    const user = userEvent.setup()
    renderPage()

    await user.click(await screen.findByRole('button', { name: 'Add transaction' }))
    let dialog = await screen.findByRole('dialog')
    await user.type(within(dialog).getByLabelText('Merchant'), 'Farmers market')
    await user.type(within(dialog).getByLabelText('Amount'), '7.20')
    // inside the period on screen, so it shows up in the list
    await user.clear(within(dialog).getByLabelText('Date'))
    await user.type(within(dialog).getByLabelText('Date'), '2026-03-05')
    await user.click(within(dialog).getByRole('button', { name: 'Add transaction' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())

    expect(await screen.findAllByText('Farmers market')).toHaveLength(2)
    expect(screen.getAllByText('Manual')).toHaveLength(2)
    const added = (await db.transactions.toArray()).find((t) => t.source === 'manual')
    expect(added).toMatchObject({
      amountMinor: 720,
      categoryRaw: 'Uncategorized',
      cardId: 'card-1',
    })

    dialog = await openEditor(user, 'Farmers market')
    await user.click(within(dialog).getByRole('button', { name: 'Delete' }))
    await user.click(within(dialog).getByRole('button', { name: /yes, delete it/i }))
    await waitFor(() => expect(screen.queryByText('Farmers market')).not.toBeInTheDocument())
    expect(await db.transactions.count()).toBe(1)
  })
})
