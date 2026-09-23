import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it } from 'vitest'
import { DashboardFiltersProvider, useDashboardFilters } from '@/hooks/DashboardFiltersContext'
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

/** Exposes the ambient DashboardFiltersContext: a button to set a card
 * override (simulating one left over from a real-data session) and a probe
 * of the current value, so a test can assert loadDemo clears it. Mirrors
 * how AppShell's real provider surrounds ImportPage under /app. */
function FiltersHarness() {
  const { filters, setCardId } = useDashboardFilters()
  return (
    <>
      <button type="button" onClick={() => setCardId('card-old')}>
        Set stale card override
      </button>
      <span data-testid="card-id-probe">{filters?.cardId ?? ''}</span>
    </>
  )
}

function renderImportPageWithFilters() {
  return render(
    <MemoryRouter>
      <DashboardFiltersProvider>
        <ImportPage />
        <FiltersHarness />
      </DashboardFiltersProvider>
    </MemoryRouter>,
  )
}

describe('ImportPage', () => {
  it('shows the import heading and the file picker', () => {
    renderImportPage()
    expect(
      screen.getByRole('heading', { name: /import your ether\.fi export/i }),
    ).toBeInTheDocument()
    expect(screen.getByLabelText(/choose an xlsx file/i)).toBeInTheDocument()
  })

  it('loads the synthetic demo dataset when "Try a demo instead" is clicked', async () => {
    renderImportPage()
    await userEvent.click(screen.getByRole('button', { name: /try a demo instead/i }))
    await waitFor(async () => {
      expect(await db.transactions.count()).toBeGreaterThan(0)
    })
  })

  it('clears a stale card filter override left over from real data before loading the demo', async () => {
    // Seed just enough data (bypassing commitImport, so no import record
    // exists) for DashboardFiltersProvider to have real defaults to
    // override, mirroring a card selection made before all data was
    // deleted and the demo was tried from a bare Import screen.
    await db.cards.put({ id: 'card-old', last4: '9999', cardHolderKey: 'someone', label: 'Card' })
    await db.transactions.put({
      id: 'txn-old',
      cardId: 'card-old',
      identityKey: 'key-old',
      importId: 'import-old',
      timestampUtc: '2026-01-15T10:00:00.000Z',
      type: 'card_spend',
      description: 'Merchant A',
      status: 'CLEARED',
      amountMinor: 450,
      currency: 'USD',
      originalAmountMinor: 450,
      originalCurrency: 'USD',
      cashbackMinor: 14,
      cashbackCurrency: 'USD',
      categoryRaw: '5411 - Grocery Stores and Supermarkets',
      spendingMode: 'Direct Pay',
    })

    renderImportPageWithFilters()

    await userEvent.click(screen.getByRole('button', { name: /set stale card override/i }))
    await waitFor(() => {
      expect(screen.getByTestId('card-id-probe').textContent).toBe('card-old')
    })

    await userEvent.click(screen.getByRole('button', { name: /try a demo instead/i }))

    await waitFor(() => {
      expect(screen.getByTestId('card-id-probe').textContent).toBe('')
    })
  })
})
