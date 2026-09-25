import { act, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { InstallPromptProvider } from '@/hooks/InstallPromptContext'
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
    <InstallPromptProvider>
      <MemoryRouter>
        <Home />
      </MemoryRouter>
    </InstallPromptProvider>,
  )
}

describe('Home', () => {
  it('gives the browser tab the full site title', () => {
    document.title = 'Transactions · Web3Spend'
    renderHome()
    expect(document.title).toBe(HOME_TITLE)
  })

  it('leads with the tagline', () => {
    renderHome()
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      'Your crypto card spending, finally clear.',
    )
  })

  it('says it works offline once loaded, not after an install', () => {
    renderHome()
    expect(screen.getByText('Once loaded')).toBeInTheDocument()
    expect(screen.queryByText('After install')).not.toBeInTheDocument()
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
    expect(screen.getByText('Drop it in')).toBeInTheDocument()
    expect(screen.getByText('See your spending')).toBeInTheDocument()
  })

  it("says how to export, with a link to ether.fi's guide", () => {
    renderHome()
    const section = screen.getByRole('region', { name: /3 simple steps/i })

    expect(within(section).getByText('How do I export?')).toBeInTheDocument()
    expect(within(section).getByText(/open transaction history/i)).toBeInTheDocument()
    expect(within(section).getByRole('link', { name: /ether\.fi's guide/i })).toHaveAttribute(
      'href',
      'https://help.ether.fi/en/articles/685844-how-to-download-your-card-transaction-history',
    )
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

  it('asks which card to support next, linking to X in a new tab', () => {
    renderHome()
    expect(screen.getByRole('heading', { name: 'Want to see your card here?' })).toBeInTheDocument()
    const link = screen.getByRole('link', { name: /request a card/i })
    expect(link).toHaveAttribute('href', 'https://x.com/goodmorningdevs')
    expect(link).toHaveAttribute('target', '_blank')
  })

  it('credits goodmorning.dev in the footer, opening in a new tab', () => {
    renderHome()
    expect(screen.getByRole('contentinfo')).toHaveTextContent('Made by goodmorning.dev')
    const link = screen.getByRole('link', { name: 'goodmorning.dev' })
    expect(link).toHaveAttribute('href', 'https://goodmorning.dev')
    expect(link).toHaveAttribute('target', '_blank')
  })

  it('scrolls back to the top when the footer logo is clicked on the home page', async () => {
    const scrollTo = vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
    render(
      <InstallPromptProvider>
        <MemoryRouter initialEntries={['/home']}>
          <Home />
        </MemoryRouter>
      </InstallPromptProvider>,
    )
    const logo = within(screen.getByRole('contentinfo')).getByRole('link', {
      name: 'Web3Spend home',
    })

    expect(logo).toHaveAttribute('href', '/home')
    await userEvent.click(logo)
    expect(scrollTo).toHaveBeenCalledWith({ top: 0, left: 0, behavior: 'smooth' })
    scrollTo.mockRestore()
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

  it('says how to install the app on desktop, iPhone and Android', () => {
    renderHome()
    const section = screen.getByRole('region', { name: /as an app/i })

    expect(within(section).getByText('Desktop')).toBeInTheDocument()
    expect(within(section).getByText(/tap share, then add to home screen/i)).toBeInTheDocument()
    expect(within(section).getByText(/tap install app/i)).toBeInTheDocument()
    expect(within(section).queryByRole('button', { name: /install/i })).not.toBeInTheDocument()
  })

  it('offers to install right away where the browser allows it', async () => {
    renderHome()
    const prompt = vi.fn().mockResolvedValue(undefined)
    const event = new Event('beforeinstallprompt', { cancelable: true })
    Object.assign(event, { preventDefault: () => {}, prompt, userChoice: new Promise(() => {}) })

    act(() => {
      window.dispatchEvent(event)
    })
    await userEvent.click(await screen.findByRole('button', { name: 'Install Web3Spend' }))

    expect(prompt).toHaveBeenCalledTimes(1)
  })

  it('lays out the roadmap stages in order, each with its status', () => {
    renderHome()
    const stages = within(screen.getByRole('region', { name: /where we're headed/i })).getAllByRole(
      'listitem',
    )

    expect(stages.map((stage) => within(stage).getByRole('heading').textContent)).toEqual([
      'Foundation',
      'Make It Yours',
      'Level Up',
      'More Cards',
    ])
    expect(within(stages[0]).getByText('Live')).toBeInTheDocument()
    expect(within(stages[1]).getByText('Next')).toBeInTheDocument()
  })

  it('answers the common questions, each opening on click', async () => {
    renderHome()
    const section = screen.getByRole('region', { name: /questions, answered/i })
    const questions = within(section)
      .getAllByRole('group')
      .map((item) => item.querySelector('summary')?.textContent)

    expect(questions).toEqual([
      "How do I know my data isn't sent anywhere?",
      'Where do I get my export?',
      'Is this affiliated with ether.fi?',
      'What does it show me?',
    ])

    const affiliation = within(section).getByText('Is this affiliated with ether.fi?')
    expect(affiliation.closest('details')).not.toHaveAttribute('open')
    await userEvent.click(affiliation)
    expect(affiliation.closest('details')).toHaveAttribute('open')
    expect(within(section).getByText(/isn't endorsed by or connected to ether\.fi/i)).toBeVisible()
    expect(within(section).queryByRole('link', { name: /ask us on x/i })).not.toBeInTheDocument()
  })

  it('gives three ways to check nothing is sent, and the steps to the export', () => {
    renderHome()
    const section = screen.getByRole('region', { name: /questions, answered/i })

    expect(within(section).getByText('Read the code.')).toBeInTheDocument()
    expect(within(section).getByText('Watch the network.')).toBeInTheDocument()
    expect(within(section).getByText('Go offline.')).toBeInTheDocument()
    expect(within(section).getByRole('link', { name: 'See it on GitHub' })).toHaveAttribute(
      'href',
      'https://github.com/goodmorning-dev/web3spend',
    )
    expect(within(section).getByRole('link', { name: 'Transaction History page' })).toHaveAttribute(
      'href',
      'https://www.ether.fi/app/cash/transaction-history',
    )
  })
})
