import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it } from 'vitest'
import { resetDatabase } from '@/storage/test-helpers'
import App from './App'

afterEach(resetDatabase)

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  )
}

describe('App routing', () => {
  it('redirects the root path to /home', () => {
    renderAt('/')
    expect(screen.getByRole('heading', { name: 'Web3Spend' })).toBeInTheDocument()
  })

  it('renders Home at /home', () => {
    renderAt('/home')
    expect(screen.getByRole('heading', { name: 'Web3Spend' })).toBeInTheDocument()
  })

  it('renders the app shell with the Dashboard at /app', async () => {
    renderAt('/app')
    expect(
      await screen.findByRole('heading', { name: /import your etherfi export/i }),
    ).toBeInTheDocument()
    // the shell (sidebar nav) renders alongside the page content; "Transactions"
    // (exact) is the sidebar link, distinct from the topbar's "Import transactions"
    expect(screen.getByRole('link', { name: 'Transactions' })).toBeInTheDocument()
  })

  it('renders the Transactions page within the shell at /app/transactions', async () => {
    renderAt('/app/transactions')
    // both the topbar title and the page's own heading say "Transactions";
    // the page heading is the h1
    expect(
      await screen.findByRole('heading', { name: 'Transactions', level: 1 }),
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /dashboard/i })).toBeInTheDocument()
  })

  it('renders the Import page within the shell at /app/import', async () => {
    renderAt('/app/import')
    expect(
      await screen.findByRole('heading', { name: /import your etherfi export/i }),
    ).toBeInTheDocument()
    expect(screen.getByLabelText(/choose an xlsx file/i)).toBeInTheDocument()
  })

  it('redirects an unknown path to /home', () => {
    renderAt('/something-that-does-not-exist')
    expect(screen.getByRole('heading', { name: 'Web3Spend' })).toBeInTheDocument()
  })
})
