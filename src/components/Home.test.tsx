import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import Home from './Home'

function renderHome() {
  return render(
    <MemoryRouter>
      <Home />
    </MemoryRouter>,
  )
}

describe('Home', () => {
  it('states the privacy promise up front', () => {
    renderHome()
    expect(screen.getByText(/read, stored, and calculated on this device/i)).toBeInTheDocument()
  })

  it('explains how it works in three steps', () => {
    renderHome()
    expect(screen.getByText('Export from Etherfi')).toBeInTheDocument()
    expect(screen.getByText('Import here')).toBeInTheDocument()
    expect(screen.getByText('See your spending')).toBeInTheDocument()
  })

  it('links both call-to-action buttons to /app', () => {
    renderHome()
    expect(screen.getByRole('link', { name: /import your export/i })).toHaveAttribute(
      'href',
      '/app',
    )
    expect(screen.getByRole('link', { name: /try the demo/i })).toHaveAttribute('href', '/app')
  })

  it('links the "want a new provider" card to X, opening in a new tab', () => {
    renderHome()
    const link = screen.getByRole('link', { name: /goodmorningdevs/i })
    expect(link).toHaveAttribute('href', 'https://x.com/goodmorningdevs')
    expect(link).toHaveAttribute('target', '_blank')
  })
})
