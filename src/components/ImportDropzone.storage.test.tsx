import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { commitImport } from '@/matching/commitImport'
import { requestPersistentStorage, STORAGE_FULL_MESSAGE } from '@/storage/persistence'
import ImportDropzone from './ImportDropzone'

// Parsing and the database write are faked here so these tests can focus
// on what happens around them: a full browser storage, and asking the
// browser to keep the data after a real import.
vi.mock('@/adapters', () => ({
  ETHERFI_PARSER_VERSION: 'test',
  etherfiAdapter: { parse: () => ({ rows: [], unsupported: [] }) },
}))
vi.mock('@/matching/commitImport', () => ({ commitImport: vi.fn() }))
vi.mock('@/storage/persistence', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/storage/persistence')>()),
  requestPersistentStorage: vi.fn(() => Promise.resolve('persisted')),
}))

afterEach(() => {
  vi.mocked(commitImport).mockReset()
  vi.mocked(requestPersistentStorage).mockClear()
})

function anExport(): File {
  return new File(['not really a workbook'], 'export.xlsx')
}

describe('ImportDropzone and browser storage', () => {
  it('explains a full browser storage plainly, and that nothing changed', async () => {
    const user = userEvent.setup()
    vi.mocked(commitImport).mockRejectedValue(
      new DOMException('The quota has been exceeded.', 'QuotaExceededError'),
    )

    render(<ImportDropzone />)
    await user.upload(screen.getByLabelText(/choose an xlsx file/i), anExport())

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('Out of storage space')
    expect(alert).toHaveTextContent(STORAGE_FULL_MESSAGE)
    expect(requestPersistentStorage).not.toHaveBeenCalled()
  })

  it('asks the browser to keep the data once a real import has gone through', async () => {
    const user = userEvent.setup()
    vi.mocked(commitImport).mockResolvedValue({
      rowCounts: { added: 3, updated: 0, unsupported: 0 },
      alreadyImported: false,
    } as Awaited<ReturnType<typeof commitImport>>)

    render(<ImportDropzone />)
    await user.upload(screen.getByLabelText(/choose an xlsx file/i), anExport())

    expect(await screen.findByText('3 added, 0 updated.')).toBeInTheDocument()
    await waitFor(() => expect(requestPersistentStorage).toHaveBeenCalledTimes(1))
  })
})
