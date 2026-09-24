import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it } from 'vitest'
import { HOME_TITLE } from '@/hooks/usePageTitle'
import { commitImport } from '@/matching/commitImport'
import { getDataSource } from '@/storage/dataSource'
import { db, demoDb, realDb } from '@/storage/db'
import { resetDatabase } from '@/storage/test-helpers'
import Home from './Home'

afterEach(async () => {
  await resetDatabase()
})

function renderHome() {
  return render(
    <MemoryRouter>
      <Home />
    </MemoryRouter>,
  )
}

describe('Home', () => {
  it('gives the browser tab the full site title', () => {
    document.title = 'Transactions · Web3Spend'
    renderHome()
    expect(document.title).toBe(HOME_TITLE)
  })

  it('states the privacy promise up front', () => {
    renderHome()
    expect(
      screen.getByText(/clear insights into your spending and cashback, all in your browser/i),
    ).toBeInTheDocument()
  })

  it('explains how it works in three steps', () => {
    renderHome()
    expect(screen.getByText('Export from ether.fi')).toBeInTheDocument()
    expect(screen.getByText('Import here')).toBeInTheDocument()
    expect(screen.getByText('See your spending')).toBeInTheDocument()
  })

  it('links the import call-to-action to /app', () => {
    renderHome()
    expect(screen.getByRole('link', { name: /import your ether\.fi export/i })).toHaveAttribute(
      'href',
      '/app',
    )
  })

  it('loads the synthetic demo dataset when "Try a demo" is clicked', async () => {
    renderHome()
    await userEvent.click(screen.getByRole('button', { name: /try a demo/i }))
    await waitFor(async () => {
      expect(await db.transactions.count()).toBeGreaterThan(0)
    })
    const cards = await db.cards.toArray()
    expect(cards.length).toBeGreaterThan(0)
  })

  it('opens the demo even with real transactions imported, leaving them untouched', async () => {
    await commitImport(
      [
        {
          last4: '1234',
          cardHolderKey: 'jane doe',
          timestampUtc: '2026-01-15T10:00:00.000Z',
          type: 'card_spend',
          description: 'Merchant A',
          status: 'CLEARED',
          amountMinor: 450,
          currency: 'EUR',
          originalAmountMinor: 450,
          originalCurrency: 'EUR',
          cashbackMinor: 14,
          cashbackCurrency: 'EUR',
          categoryRaw: '5411 - Grocery Stores and Supermarkets',
          spendingMode: 'Direct Pay',
        },
      ],
      { fileHash: 'real-hash-1', parserVersion: 'test-1', unsupportedCount: 0 },
    )

    renderHome()
    await userEvent.click(screen.getByRole('button', { name: /try a demo/i }))

    await waitFor(() => expect(getDataSource()).toBe('demo'))
    await waitFor(async () => expect(await demoDb.transactions.count()).toBeGreaterThan(1))
    expect(await realDb.transactions.count()).toBe(1)
  })

  it('links the top-right action to /app', () => {
    renderHome()
    expect(screen.getByRole('link', { name: /open app/i })).toHaveAttribute('href', '/app')
  })

  it('links the "want a new provider" card to X, opening in a new tab', () => {
    renderHome()
    const link = screen.getByRole('link', { name: /let us know on x/i })
    expect(link).toHaveAttribute('href', 'https://x.com/goodmorningdevs')
    expect(link).toHaveAttribute('target', '_blank')
  })

  it('links to the GitHub repo in the footer, opening in a new tab', () => {
    renderHome()
    const link = screen.getByRole('link', { name: /source on github/i })
    expect(link).toHaveAttribute('href', 'https://github.com/goodmorning-dev/web3spend')
    expect(link).toHaveAttribute('target', '_blank')
  })

  it('does not show Features, Privacy, or FAQ nav links', () => {
    renderHome()
    expect(screen.queryByRole('link', { name: /^features$/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /^privacy$/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /^faq$/i })).not.toBeInTheDocument()
  })
})
