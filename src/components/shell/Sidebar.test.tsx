import { fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import Sidebar from './Sidebar'

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Sidebar />
    </MemoryRouter>,
  )
}

describe('Sidebar', () => {
  it('links each nav item to its route', () => {
    renderAt('/app')

    expect(screen.getByRole('link', { name: /dashboard/i })).toHaveAttribute('href', '/app')
    expect(screen.getByRole('link', { name: /transactions/i })).toHaveAttribute(
      'href',
      '/app/transactions',
    )
    expect(screen.getByRole('link', { name: /subscriptions/i })).toHaveAttribute(
      'href',
      '/app/subscriptions',
    )
    expect(screen.getByRole('link', { name: /import/i })).toHaveAttribute('href', '/app/import')
    expect(screen.getByRole('link', { name: /settings/i })).toHaveAttribute('href', '/app/settings')
  })

  it('lists Settings with the other pages, right after Import', () => {
    renderAt('/app')

    const links = within(screen.getByRole('navigation', { name: 'Sidebar' })).getAllByRole('link')
    expect(links.map((link) => link.textContent)).toEqual([
      'Dashboard',
      'Transactions',
      'Subscriptions',
      'Import',
      'Settings',
    ])
  })

  it('takes you to the home page from the logo', () => {
    renderAt('/app/transactions')

    expect(screen.getByRole('link', { name: 'Web3Spend home' })).toHaveAttribute('href', '/home')
  })

  it('marks the Dashboard link active only on the exact /app route, not on nested pages', () => {
    renderAt('/app/transactions')

    expect(screen.getByRole('link', { name: /dashboard/i })).not.toHaveAttribute('aria-current')
    expect(screen.getByRole('link', { name: /transactions/i })).toHaveAttribute(
      'aria-current',
      'page',
    )
  })

  it('marks the Settings link active on /app/settings', () => {
    renderAt('/app/settings')

    expect(screen.getByRole('link', { name: /settings/i })).toHaveAttribute('aria-current', 'page')
  })

  it('scrolls back to the top when the page already open is clicked again', () => {
    const scrollTo = vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
    renderAt('/app/transactions')

    fireEvent.click(screen.getByRole('link', { name: /dashboard/i }))
    expect(scrollTo).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('link', { name: /dashboard/i }))
    expect(scrollTo).toHaveBeenCalledWith({ top: 0, left: 0, behavior: 'smooth' })
    scrollTo.mockRestore()
  })
})
