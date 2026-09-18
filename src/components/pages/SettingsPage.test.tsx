import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'
import { db } from '@/storage/db'
import { resetDatabase } from '@/storage/test-helpers'
import SettingsPage from './SettingsPage'

afterEach(resetDatabase)

async function seedSomeData() {
  await db.cards.put({ id: 'card-1', last4: '1234', cardHolderKey: 'jane doe', label: 'Card' })
  await db.transactions.put({
    id: 'txn-1',
    cardId: 'card-1',
    timestampUtc: '2026-01-15T10:00:00.000Z',
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
  })
  await db.imports.put({
    id: 'import-1',
    fileHash: 'hash-1',
    importedAt: '2026-01-15T10:00:00.000Z',
    parserVersion: '1',
    rowCounts: { added: 1, updated: 0, unsupported: 0 },
  })
}

describe('SettingsPage', () => {
  it('explains that data is local to this browser before offering to delete it', () => {
    render(<SettingsPage />)

    expect(screen.getByRole('heading', { name: 'Settings' })).toBeInTheDocument()
    expect(screen.getByText(/stored only in this browser on this device/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /delete all data/i })).toBeInTheDocument()
  })

  it('does nothing until the confirmation dialog is accepted', async () => {
    const user = userEvent.setup()
    await seedSomeData()
    render(<SettingsPage />)

    await user.click(screen.getByRole('button', { name: /delete all data/i }))
    expect(
      await screen.findByRole('heading', { name: /delete all local data\?/i }),
    ).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /cancel/i }))

    expect(await db.transactions.count()).toBe(1)
    expect(screen.queryByText(/all local data has been deleted/i)).not.toBeInTheDocument()
  })

  it('clears every table and confirms once the deletion is accepted', async () => {
    const user = userEvent.setup()
    await seedSomeData()
    render(<SettingsPage />)

    await user.click(screen.getByRole('button', { name: /delete all data/i }))
    await user.click(await screen.findByRole('button', { name: /delete everything/i }))

    expect(await screen.findByText(/all local data has been deleted/i)).toBeInTheDocument()
    expect(await db.cards.count()).toBe(0)
    expect(await db.transactions.count()).toBe(0)
    expect(await db.imports.count()).toBe(0)
  })
})
