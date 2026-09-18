import { render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { db } from '@/storage/db'
import { resetDatabase } from '@/storage/test-helpers'
import DashboardPage from './DashboardPage'

const originalTz = process.env.TZ

afterEach(async () => {
  await resetDatabase()
  if (originalTz === undefined) {
    delete process.env.TZ
  } else {
    process.env.TZ = originalTz
  }
})

describe('DashboardPage', () => {
  it('shows the import prompt when there is no local data', async () => {
    render(<DashboardPage />)
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

    render(<DashboardPage />)

    expect(await screen.findByRole('heading', { name: /your data/i })).toBeInTheDocument()
    expect(screen.getByText('2 transactions imported.')).toBeInTheDocument()
  })

  it('formats the observed transaction range in UTC, unaffected by the viewer local timezone', async () => {
    const timestampUtc = '2026-01-31T23:30:00.000Z'
    const dateFormatOptions = { year: 'numeric', month: 'short', day: 'numeric' } as const

    process.env.TZ = 'Pacific/Kiritimati' // UTC+14: far enough ahead to flip the calendar day
    const correctUtcText = new Date(timestampUtc).toLocaleDateString(undefined, {
      ...dateFormatOptions,
      timeZone: 'UTC',
    })
    const wrongLocalText = new Date(timestampUtc).toLocaleDateString(undefined, dateFormatOptions)
    expect(correctUtcText).not.toBe(wrongLocalText)

    await db.cards.put({
      id: 'card-1',
      last4: '1234',
      cardHolderKey: 'jane doe',
      label: 'Card ****1234',
    })
    await db.transactions.put({
      id: 'txn-1',
      cardId: 'card-1',
      timestampUtc,
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

    render(<DashboardPage />)
    await screen.findByRole('heading', { name: /your data/i })

    expect(document.body.textContent).toContain(correctUtcText)
    expect(document.body.textContent).not.toContain(wrongLocalText)
  })
})
