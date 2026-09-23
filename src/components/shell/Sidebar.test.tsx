import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
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
})
