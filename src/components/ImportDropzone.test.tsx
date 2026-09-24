import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'
import { utils, write, type WorkBook } from 'xlsx'
import { getDataSource } from '@/storage/dataSource'
import { db, demoDb, realDb } from '@/storage/db'
import { openDemo } from '@/storage/demoData'
import { resetDatabase } from '@/storage/test-helpers'
import ImportDropzone from './ImportDropzone'

afterEach(resetDatabase)

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

function buildValidWorkbook(): WorkBook {
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

function buildInvalidWorkbook(): WorkBook {
  const workbook = utils.book_new()
  utils.book_append_sheet(workbook, utils.aoa_to_sheet([['nope']]), 'Some Sheet')
  return workbook
}

function toFile(workbook: WorkBook, name = 'export.xlsx'): File {
  const buffer = write(workbook, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer
  return new File([buffer], name, {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
}

describe('ImportDropzone', () => {
  it('imports a valid file, committing it and reporting added/updated counts', async () => {
    const user = userEvent.setup()
    render(<ImportDropzone />)

    const input = screen.getByLabelText(/choose an xlsx file/i)
    await user.upload(input, toFile(buildValidWorkbook()))

    expect(await screen.findByText('1 added, 0 updated.')).toBeInTheDocument()
    expect(await db.transactions.count()).toBe(1)
  })

  it('reports an unsupported row plainly, with its row number and reason', async () => {
    const user = userEvent.setup()
    render(<ImportDropzone />)

    const input = screen.getByLabelText(/choose an xlsx file/i)
    await user.upload(input, toFile(buildValidWorkbook()))

    expect(await screen.findByText(/1 row could not be imported/i)).toBeInTheDocument()
    expect(screen.getByText(/row 3: unsupported status: reversed/i)).toBeInTheDocument()
  })

  it('rejects a non-XLSX file before attempting to parse it', async () => {
    // applyAccept: false, because this specifically tests our own defensive
    // check, not the browser's native accept="" filtering (which user-event
    // otherwise simulates and would refuse to "select" a mismatched file).
    const user = userEvent.setup({ applyAccept: false })
    render(<ImportDropzone />)

    const input = screen.getByLabelText(/choose an xlsx file/i)
    const csvFile = new File(['a,b,c'], 'export.csv', { type: 'text/csv' })
    await user.upload(input, csvFile)

    expect(await screen.findByText(/only xlsx files are supported/i)).toBeInTheDocument()
    expect(await db.transactions.count()).toBe(0)
  })

  it('shows a friendly error when the workbook has no "All Transactions" sheet', async () => {
    const user = userEvent.setup()
    render(<ImportDropzone />)

    const input = screen.getByLabelText(/choose an xlsx file/i)
    await user.upload(input, toFile(buildInvalidWorkbook()))

    expect(await screen.findByText(/we couldn't import that file/i)).toBeInTheDocument()
    expect(screen.getByText(/all transactions/i)).toBeInTheDocument()
    expect(await db.transactions.count()).toBe(0)
  })

  it('reports that a file was already imported instead of reprocessing it', async () => {
    const user = userEvent.setup()
    render(<ImportDropzone />)

    const input = screen.getByLabelText(/choose an xlsx file/i)
    const file = toFile(buildValidWorkbook())

    await user.upload(input, file)
    expect(await screen.findByText('1 added, 0 updated.')).toBeInTheDocument()

    await user.upload(input, file)
    expect(await screen.findByText(/already been imported/i)).toBeInTheDocument()
    expect(await db.transactions.count()).toBe(1)
  })

  it("goes back to the person's own data for a file imported while the demo is on screen", async () => {
    await openDemo()
    const demoCount = await demoDb.transactions.count()

    const user = userEvent.setup()
    render(<ImportDropzone />)

    const input = screen.getByLabelText(/choose an xlsx file/i)
    await user.upload(input, toFile(buildValidWorkbook()))

    expect(await screen.findByText('1 added, 0 updated.')).toBeInTheDocument()
    expect(getDataSource()).toBe('real')
    expect(await realDb.transactions.count()).toBe(1)
    expect(await demoDb.transactions.count()).toBe(demoCount)
  })

  it('shows the optional result action once an import finishes, and not before', async () => {
    const user = userEvent.setup()
    render(<ImportDropzone resultAction={<a href="/app">View your dashboard</a>} />)

    expect(screen.queryByRole('link', { name: 'View your dashboard' })).not.toBeInTheDocument()

    await user.upload(screen.getByLabelText(/choose an xlsx file/i), toFile(buildValidWorkbook()))

    expect(await screen.findByText('1 added, 0 updated.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'View your dashboard' })).toHaveAttribute(
      'href',
      '/app',
    )
  })
})
