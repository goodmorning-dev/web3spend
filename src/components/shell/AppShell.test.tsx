import { render, screen, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, describe, expect, it } from 'vitest'
import { resetDatabase } from '@/storage/test-helpers'
import AppShell from './AppShell'

afterEach(resetDatabase)

describe('AppShell', () => {
  it('shows the same footer as the home page under every app page', () => {
    render(
      <MemoryRouter initialEntries={['/app/settings']}>
        <Routes>
          <Route path="/app" element={<AppShell />}>
            <Route path="settings" element={<p>Settings page</p>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    )

    const footer = screen.getByRole('contentinfo')
    expect(footer).toHaveTextContent('Made by goodmorning.dev')
    expect(screen.getByRole('link', { name: 'goodmorning.dev' })).toHaveAttribute(
      'href',
      'https://goodmorning.dev',
    )
    expect(screen.getByRole('link', { name: /source on github/i })).toHaveAttribute(
      'href',
      'https://github.com/goodmorning-dev/web3spend',
    )
    expect(within(footer).getByRole('link', { name: 'Web3Spend home' })).toHaveAttribute(
      'href',
      '/home',
    )
  })
})
