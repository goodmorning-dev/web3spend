import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'
import { utils, write, type WorkBook } from 'xlsx'
import { DashboardFiltersProvider } from '@/hooks/DashboardFiltersContext'
import { db } from '@/storage/db'
import { resetDatabase } from '@/storage/test-helpers'
import DashboardPage from './DashboardPage'

const HEADER_ROW = [
  'timestamp',
  'type',
  'description',
  'status',
  'amount',
  'currency',
  'card',
  'card holder name',
  'original amount',
  'original currency',
  'cashback earned',
  'cashback currency',
  'category',
  'spending mode',
]

function buildWorkbookWithOneUnsupportedRow(): WorkBook {
  const workbook = utils.book_new()
  utils.book_append_sheet(
    workbook,
    utils.aoa_to_sheet([
      HEADER_ROW,
      [
        '2026-01-15 10:00:00 UTC',
        'card_spend',
        'Merchant A',
        'CLEARED',
        4.5,
        'EUR',
        '1234',
        'Jane Doe',
        4.5,
        'EUR',
        0.14,
        'EUR',
        '5411 - Grocery Stores and Supermarkets',
        'Direct Pay',
      ],
      [
        '2026-01-16 10:00:00 UTC',
        'card_spend',
        'Merchant B',
        'REVERSED',
        1,
        'EUR',
        '1234',
        'Jane Doe',
        1,
        'EUR',
        0,
        'EUR',
        'Miscellaneous',
        'Direct Pay',
      ],
    ]),
    'All Transactions',
  )
  return workbook
}

function toFile(workbook: WorkBook, name = 'export.xlsx'): File {
  const buffer = write(workbook, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer
  return new File([buffer], name, {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
}

const originalTz = process.env.TZ

afterEach(async () => {
  await resetDatabase()
  if (originalTz === undefined) {
    delete process.env.TZ
  } else {
    process.env.TZ = originalTz
  }
})

function renderDashboardPage() {
  return render(
    <DashboardFiltersProvider>
      <DashboardPage />
    </DashboardFiltersProvider>,
  )
}

describe('DashboardPage', () => {
  it('shows the import prompt when there is no local data', async () => {
    renderDashboardPage()
    expect(
      await screen.findByRole('heading', { name: /import your etherfi export/i }),
    ).toBeInTheDocument()
  })

  it('shows the KPI row, scoped to the default (most recent) period, once transactions exist', async () => {
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

    renderDashboardPage()

    expect(await screen.findByText('Total spent')).toBeInTheDocument()
    expect(screen.getByText('Cashback earned')).toBeInTheDocument()
    expect(screen.getByText('Effective cashback')).toBeInTheDocument()
    expect(screen.getByText('across 2 cleared purchases')).toBeInTheDocument()
  })

  it('formats the last import date in UTC, unaffected by the viewer local timezone', async () => {
    const importedAt = '2026-01-31T23:30:00.000Z'
    const dateFormatOptions = { year: 'numeric', month: 'short', day: 'numeric' } as const

    process.env.TZ = 'Pacific/Kiritimati' // UTC+14: far enough ahead to flip the calendar day
    const correctUtcText = new Date(importedAt).toLocaleDateString(undefined, {
      ...dateFormatOptions,
      timeZone: 'UTC',
    })
    const wrongLocalText = new Date(importedAt).toLocaleDateString(undefined, dateFormatOptions)
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
      timestampUtc: '2026-01-15T00:00:00.000Z',
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
      importedAt,
      parserVersion: '1',
      rowCounts: { added: 1, updated: 0, unsupported: 0 },
    })

    renderDashboardPage()
    await screen.findByText('Total spent')

    expect(document.body.textContent).toContain(correctUtcText)
    expect(document.body.textContent).not.toContain(wrongLocalText)
  })

  it('keeps the import result, including unsupported-row warnings, visible once the first import completes', async () => {
    const user = userEvent.setup()
    renderDashboardPage()

    await screen.findByRole('heading', { name: /import your etherfi export/i })

    const input = screen.getByLabelText(/choose an xlsx file/i)
    await user.upload(input, toFile(buildWorkbookWithOneUnsupportedRow()))

    expect(await screen.findByText('Total spent')).toBeInTheDocument()
    expect(screen.getByText('1 added, 0 updated.')).toBeInTheDocument()
    expect(screen.getByText(/1 row could not be imported/i)).toBeInTheDocument()
  })
})
