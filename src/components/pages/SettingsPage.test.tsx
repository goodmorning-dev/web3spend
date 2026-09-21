import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { DashboardFiltersProvider, useDashboardFilters } from '@/hooks/DashboardFiltersContext'
import { InstallPromptProvider } from '@/hooks/InstallPromptContext'
import { db } from '@/storage/db'
import * as deleteAllDataModule from '@/storage/deleteAllData'
import { resetDatabase } from '@/storage/test-helpers'
import SettingsPage from './SettingsPage'

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  return resetDatabase()
})

interface FakeInstallPromptFields {
  preventDefault?: () => void
  prompt?: () => Promise<void>
  userChoice?: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

function dispatchBeforeInstallPrompt(overrides: FakeInstallPromptFields = {}) {
  const event = new Event('beforeinstallprompt', { cancelable: true })
  Object.assign(event, { preventDefault: () => {}, ...overrides })
  window.dispatchEvent(event)
}

function stubIosSafariUserAgent() {
  vi.stubGlobal('navigator', {
    ...window.navigator,
    userAgent:
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
  })
}

/** iPadOS Safari's default UA since iPadOS 13: it claims to be a Mac, and
 * is distinguished from a real Mac only by reporting touch points. */
function stubIpadDesktopModeUserAgent() {
  vi.stubGlobal('navigator', {
    ...window.navigator,
    userAgent:
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_6) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15',
    maxTouchPoints: 5,
  })
}

async function seedSomeData() {
  await db.cards.put({ id: 'card-1', last4: '1234', cardHolderKey: 'jane doe', label: 'Card' })
  await db.transactions.put({
    id: 'txn-1',
    cardId: 'card-1',
    timestampUtc: '2026-01-15T10:00:00.000Z',
    type: 'card_spend',
    description: 'Coffee Shop',
    status: 'CLEARED',
    amountMinor: 450,
    currency: 'EUR',
    originalAmountMinor: 450,
    originalCurrency: 'EUR',
    cashbackMinor: 9,
    cashbackCurrency: 'EUR',
    categoryRaw: 'Groceries',
    spendingMode: 'Direct Pay',
    identityKey: 'key-1',
    importId: 'import-1',
  })
  await db.imports.put({
    id: 'import-1',
    fileHash: 'hash-1',
    importedAt: '2026-01-15T10:00:00.000Z',
    parserVersion: '1',
    rowCounts: { added: 1, updated: 0, unsupported: 0 },
  })
}

function renderSettingsPage() {
  return render(
    <InstallPromptProvider>
      <DashboardFiltersProvider>
        <SettingsPage />
      </DashboardFiltersProvider>
    </InstallPromptProvider>,
  )
}

/** Exposes the current card filter override alongside SettingsPage, so a
 * test can observe DashboardFiltersContext state that SettingsPage itself
 * doesn't render anywhere. */
function CardFilterProbe() {
  const { filters, setCardId } = useDashboardFilters()
  return (
    <div>
      <span data-testid="card-filter">{filters?.cardId ?? 'none'}</span>
      <button type="button" onClick={() => setCardId('card-1')}>
        Filter by card-1
      </button>
    </div>
  )
}

describe('SettingsPage', () => {
  it('shows no install section on a browser that offers neither an install prompt nor is iOS Safari', () => {
    renderSettingsPage()
    expect(screen.queryByRole('heading', { name: 'Install Web3Spend' })).not.toBeInTheDocument()
  })

  it('offers an install button once the browser fires beforeinstallprompt, and installing hides it', async () => {
    const user = userEvent.setup()
    const prompt = vi.fn().mockResolvedValue(undefined)
    const userChoice = Promise.resolve({ outcome: 'accepted' as const })
    renderSettingsPage()

    act(() => dispatchBeforeInstallPrompt({ prompt, userChoice }))

    expect(await screen.findByRole('button', { name: /install app/i })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /install app/i }))

    expect(prompt).toHaveBeenCalledTimes(1)
    await waitFor(() => {
      expect(screen.queryByRole('heading', { name: 'Install Web3Spend' })).not.toBeInTheDocument()
    })
  })

  it('shows manual Add to Home Screen steps on iOS Safari instead of a button', () => {
    stubIosSafariUserAgent()
    renderSettingsPage()

    expect(screen.getByRole('heading', { name: 'Install Web3Spend' })).toBeInTheDocument()
    expect(screen.getByText(/add to home screen/i)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /install app/i })).not.toBeInTheDocument()
  })

  it('also shows manual steps on an iPad in desktop mode, whose UA otherwise claims to be a Mac', () => {
    stubIpadDesktopModeUserAgent()
    renderSettingsPage()

    expect(screen.getByRole('heading', { name: 'Install Web3Spend' })).toBeInTheDocument()
    expect(screen.getByText(/add to home screen/i)).toBeInTheDocument()
  })

  it('explains that data is local to this browser before offering to delete it', () => {
    renderSettingsPage()

    // no page-level "Settings" heading here: the page title comes from
    // Topbar (AppShell), so a second one on the page itself would just
    // duplicate it on screen.
    expect(screen.getByRole('heading', { name: 'Delete all data' })).toBeInTheDocument()
    expect(screen.getByText(/stored only in this browser on this device/i)).toBeInTheDocument()
    expect(screen.getByText(/indexeddb/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /delete all data/i })).toBeInTheDocument()
  })

  it('does nothing until the confirmation dialog is accepted', async () => {
    const user = userEvent.setup()
    await seedSomeData()
    renderSettingsPage()

    await user.click(screen.getByRole('button', { name: /delete all data/i }))
    expect(
      await screen.findByRole('heading', { name: /delete all local data\?/i }),
    ).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /cancel/i }))

    expect(await db.transactions.count()).toBe(1)
    expect(screen.queryByText(/all local data has been deleted/i)).not.toBeInTheDocument()
  })

  it('clears every table and confirms once the deletion is accepted', async () => {
    const user = userEvent.setup()
    await seedSomeData()
    renderSettingsPage()

    await user.click(screen.getByRole('button', { name: /delete all data/i }))
    await user.click(await screen.findByRole('button', { name: /delete everything/i }))

    expect(await screen.findByText(/all local data has been deleted/i)).toBeInTheDocument()
    expect(await db.cards.count()).toBe(0)
    expect(await db.transactions.count()).toBe(0)
    expect(await db.imports.count()).toBe(0)
  })

  it('resets a selected card filter after deleting, so a later re-import is not silently hidden', async () => {
    // Right after deletion there's no data at all, so `filters` is null
    // and the card probe reads "none" regardless of whether the override
    // was actually cleared - that alone wouldn't catch a regression here.
    // The real bug only shows once new data exists again: without
    // resetFilters, the stale "card-1" override would still win over the
    // new default even though card-1 no longer exists anywhere.
    const user = userEvent.setup()
    await seedSomeData()
    render(
      <InstallPromptProvider>
        <DashboardFiltersProvider>
          <CardFilterProbe />
          <SettingsPage />
        </DashboardFiltersProvider>
      </InstallPromptProvider>,
    )

    await user.click(screen.getByRole('button', { name: /filter by card-1/i }))
    expect(screen.getByTestId('card-filter')).toHaveTextContent('card-1')

    await user.click(screen.getByRole('button', { name: /delete all data/i }))
    await user.click(await screen.findByRole('button', { name: /delete everything/i }))
    await screen.findByText(/all local data has been deleted/i)

    // simulate re-importing: a fresh card gets a fresh ID, never "card-1"
    await db.cards.put({ id: 'card-2', last4: '5678', cardHolderKey: 'jane doe', label: 'Card' })
    await db.transactions.put({
      id: 'txn-2',
      cardId: 'card-2',
      timestampUtc: '2026-04-01T00:00:00.000Z',
      type: 'card_spend',
      description: 'Groceries',
      status: 'CLEARED',
      amountMinor: 1000,
      currency: 'EUR',
      originalAmountMinor: 1000,
      originalCurrency: 'EUR',
      cashbackMinor: 20,
      cashbackCurrency: 'EUR',
      categoryRaw: 'Groceries',
      spendingMode: 'Direct Pay',
      identityKey: 'key-2',
      importId: 'import-2',
    })

    // a longer timeout than the default: waits on the shared filter
    // options' live query resolving twice in a row (once for the emptied
    // database, once for the re-imported data), which can occasionally
    // take a beat longer than 1s under a loaded test run.
    await waitFor(() => expect(screen.getByTestId('card-filter')).toHaveTextContent('none'), {
      timeout: 3000,
    })
  })

  it("shows an actionable error, and doesn't claim success, when deletion fails", async () => {
    const user = userEvent.setup()
    await seedSomeData()
    vi.spyOn(deleteAllDataModule, 'deleteAllData').mockRejectedValueOnce(
      new Error('storage quota exceeded'),
    )
    renderSettingsPage()

    await user.click(screen.getByRole('button', { name: /delete all data/i }))
    await user.click(await screen.findByRole('button', { name: /delete everything/i }))

    expect(await screen.findByRole('alert')).toHaveTextContent(/storage quota exceeded/i)
    expect(screen.queryByText(/all local data has been deleted/i)).not.toBeInTheDocument()
    // nothing was actually removed, since the failure happened inside the
    // (mocked) deleteAllData call
    expect(await db.transactions.count()).toBe(1)
  })
})
