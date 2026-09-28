import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it } from 'vitest'
import { db } from '@/storage/db'
import { resetDatabase } from '@/storage/test-helpers'
import ImportFlow from './ImportFlow'

afterEach(async () => {
  await resetDatabase()
})

function renderImportFlow() {
  return render(
    <MemoryRouter>
      <ImportFlow />
    </MemoryRouter>,
  )
}

describe('ImportFlow', () => {
  it('shows the import heading and the file picker', () => {
    renderImportFlow()

    expect(screen.getByRole('heading', { name: /import your ether\.fi data/i })).toBeInTheDocument()
    expect(screen.getByLabelText(/choose an xlsx file/i)).toBeInTheDocument()
  })

  it("links to ether.fi's own guide on downloading a card transaction export", () => {
    renderImportFlow()

    const link = screen.getByRole('link', { name: /ether\.fi.*guide/i })
    expect(link).toHaveAttribute(
      'href',
      'https://help.ether.fi/en/articles/685844-how-to-download-your-card-transaction-history',
    )
    expect(link).toHaveAttribute('target', '_blank')
  })

  it('loads the demo when "Try a demo instead" is clicked', async () => {
    renderImportFlow()

    await userEvent.click(screen.getByRole('button', { name: /try a demo instead/i }))

    await waitFor(async () => {
      expect(await db.transactions.count()).toBeGreaterThan(0)
    })
  })
})
