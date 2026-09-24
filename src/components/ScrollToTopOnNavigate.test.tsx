import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Link, MemoryRouter, useNavigate } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import ScrollToTopOnNavigate from './ScrollToTopOnNavigate'

afterEach(() => {
  vi.restoreAllMocks()
})

function BackButton() {
  const navigate = useNavigate()
  return (
    <button type="button" onClick={() => navigate(-1)}>
      Back
    </button>
  )
}

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <ScrollToTopOnNavigate />
      <Link to="/app">Dashboard</Link>
      <Link to="/app/transactions?category=groceries">Groceries</Link>
      <BackButton />
    </MemoryRouter>,
  )
}

describe('ScrollToTopOnNavigate', () => {
  it('starts a newly opened page at the top', async () => {
    const scrollTo = vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
    renderAt('/app/transactions')
    expect(scrollTo).not.toHaveBeenCalled()

    await userEvent.click(screen.getByRole('link', { name: 'Dashboard' }))

    expect(scrollTo).toHaveBeenCalledWith({ top: 0, left: 0, behavior: 'instant' })
  })

  it('leaves the position alone when only the query string changes', async () => {
    const scrollTo = vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
    renderAt('/app/transactions')

    await userEvent.click(screen.getByRole('link', { name: 'Groceries' }))

    expect(scrollTo).not.toHaveBeenCalled()
  })

  it('leaves going back to the browser', async () => {
    renderAt('/app/transactions')
    await userEvent.click(screen.getByRole('link', { name: 'Dashboard' }))
    const scrollTo = vi.spyOn(window, 'scrollTo').mockImplementation(() => {})

    await userEvent.click(screen.getByRole('button', { name: 'Back' }))

    expect(scrollTo).not.toHaveBeenCalled()
  })
})
