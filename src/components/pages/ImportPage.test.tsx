import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it } from 'vitest'
import { db } from '@/storage/db'
import { resetDatabase } from '@/storage/test-helpers'
import ImportPage from './ImportPage'

afterEach(async () => {
  await resetDatabase()
})

function renderImportPage() {
  return render(
    <MemoryRouter>
      <ImportPage />
    </MemoryRouter>,
  )
}

describe('ImportPage', () => {
  it('shows the import heading and the file picker', () => {
    renderImportPage()
    expect(screen.getByRole('heading', { name: /import your etherfi export/i })).toBeInTheDocument()
    expect(screen.getByLabelText(/choose an xlsx file/i)).toBeInTheDocument()
  })

  it('loads the synthetic demo dataset when "Try a demo instead" is clicked', async () => {
    renderImportPage()
    await userEvent.click(screen.getByRole('button', { name: /try a demo instead/i }))
    await waitFor(async () => {
      expect(await db.transactions.count()).toBeGreaterThan(0)
    })
  })
})
