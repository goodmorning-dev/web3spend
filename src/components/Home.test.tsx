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
    expect(
      screen.getByText(/clear insights into your spending and cashback, all in your browser/i),
    ).toBeInTheDocument()
  })

  it('explains how it works in three steps', () => {
    renderHome()
    expect(screen.getByText('Export from Etherfi')).toBeInTheDocument()
    expect(screen.getByText('Import here')).toBeInTheDocument()
    expect(screen.getByText('See your spending')).toBeInTheDocument()
  })

  it('links both call-to-action buttons to /app', () => {
    renderHome()
    expect(screen.getByRole('link', { name: /import your etherfi export/i })).toHaveAttribute(
      'href',
      '/app',
    )
    expect(screen.getByRole('link', { name: /try a demo/i })).toHaveAttribute('href', '/app')
  })

  it('links the top-right action to /app', () => {
    renderHome()
    expect(screen.getByRole('link', { name: /open app/i })).toHaveAttribute('href', '/app')
  })

  it('links the "want a new provider" card to X, opening in a new tab', () => {
    renderHome()
    const link = screen.getByRole('link', { name: /let us know on x/i })
    expect(link).toHaveAttribute('href', 'https://x.com/goodmorningdevs')
    expect(link).toHaveAttribute('target', '_blank')
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
})
