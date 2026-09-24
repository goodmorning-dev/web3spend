import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { afterEach, describe, expect, it } from 'vitest'
import { commitImport } from '@/matching/commitImport'
import { getDataSource } from '@/storage/dataSource'
import { openDemo } from '@/storage/demoData'
import { resetDatabase } from '@/storage/test-helpers'
import DemoBanner from './DemoBanner'

afterEach(resetDatabase)

function LocationProbe() {
  return <span data-testid="location">{useLocation().pathname}</span>
}

function renderBanner(path = '/app/transactions') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route
          path="*"
          element={
            <>
              <DemoBanner />
              <LocationProbe />
            </>
          }
        />
      </Routes>
    </MemoryRouter>,
  )
}

async function commitRealImport() {
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
}

describe('DemoBanner', () => {
  it("shows nothing on the person's own data", () => {
    renderBanner()
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it('offers the way back to real data, staying on the same page', async () => {
    const user = userEvent.setup()
    await commitRealImport()
    await openDemo()
    renderBanner()

    expect(
      await screen.findByText("You're looking at demo data, not your own."),
    ).toBeInTheDocument()
    await user.click(await screen.findByRole('button', { name: 'Back to your data' }))

    expect(getDataSource()).toBe('real')
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
    expect(screen.getByTestId('location')).toHaveTextContent('/app/transactions')
  })

  it("exits to the dashboard's import prompt when there's no real data", async () => {
    const user = userEvent.setup()
    await openDemo()
    renderBanner()

    await user.click(await screen.findByRole('button', { name: 'Exit demo' }))

    expect(getDataSource()).toBe('real')
    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent(/^\/app$/))
  })
})
