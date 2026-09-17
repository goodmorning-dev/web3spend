import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import App from './App'

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

  it('renders the Dashboard at /app', async () => {
    renderAt('/app')
    expect(
      await screen.findByRole('heading', { name: /import your etherfi export/i }),
    ).toBeInTheDocument()
  })

  it('redirects an unknown path to /home', () => {
    renderAt('/something-that-does-not-exist')
    expect(screen.getByRole('heading', { name: 'Web3Spend' })).toBeInTheDocument()
  })
})
