import { render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { db } from '@/storage/db'
import { resetDatabase } from '@/storage/test-helpers'
import Dashboard from './Dashboard'

afterEach(resetDatabase)

describe('Dashboard', () => {
  it('shows the import prompt when there is no local data', async () => {
    render(<Dashboard />)
    expect(
      await screen.findByRole('heading', { name: /import your etherfi export/i }),
    ).toBeInTheDocument()
  })

  it('shows a data summary once transactions exist', async () => {
    await db.cards.put({
      id: 'card-1',
      last4: '1234',
      cardHolderKey: 'jane doe',
      label: 'Card ****1234',
    })
    await db.transactions.bulkPut([
      {
        id: 'txn-1',
        cardId: 'card-1',
        timestampUtc: '2026-01-01T00:00:00.000Z',
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
      },
      {
        id: 'txn-2',
        cardId: 'card-1',
        timestampUtc: '2026-01-05T00:00:00.000Z',
        type: 'card_spend',
        description: 'B',
        status: 'CLEARED',
        amountMinor: 200,
        currency: 'EUR',
        originalAmountMinor: 200,
        originalCurrency: 'EUR',
        cashbackMinor: 2,
        cashbackCurrency: 'EUR',
        categoryRaw: 'Cat',
        spendingMode: 'Direct Pay',
        identityKey: 'k2',
        importId: 'import-1',
      },
    ])
    await db.imports.put({
      id: 'import-1',
      fileHash: 'hash',
      importedAt: '2026-01-06T00:00:00.000Z',
      parserVersion: '1',
      rowCounts: { added: 2, updated: 0, unsupported: 0 },
    })

    render(<Dashboard />)

    expect(await screen.findByRole('heading', { name: /your data/i })).toBeInTheDocument()
    expect(screen.getByText('2 transactions imported.')).toBeInTheDocument()
  })
})
