import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import BrandPage from './BrandPage'

afterEach(() => {
  vi.restoreAllMocks()
})

function renderBrandPage() {
  return render(
    <MemoryRouter>
      <BrandPage />
    </MemoryRouter>,
  )
}

describe('BrandPage', () => {
  it('has a heading for each section, reachable from the contents row', () => {
    renderBrandPage()

    for (const name of ['Logo', 'Colors', 'Typography', 'Voice', 'Resources']) {
      expect(screen.getByRole('heading', { level: 2, name })).toBeInTheDocument()
      expect(screen.getByRole('link', { name })).toHaveAttribute('href', `#${name.toLowerCase()}`)
    }
  })

  it('sets the tab title', () => {
    renderBrandPage()
    expect(document.title).toBe('Brand · Web3Spend')
  })

  it('offers each logo file as a download', () => {
    renderBrandPage()

    for (const file of [
      'web3spend-mark.webp',
      'pwa-512x512.png',
      'pwa-maskable-512x512.png',
      'og-image.jpg',
    ]) {
      expect(screen.getByRole('link', { name: file })).toHaveAttribute('download', file)
    }
  })

  it("copies a color's hex code when its swatch is clicked", async () => {
    const user = userEvent.setup()
    // userEvent.setup() installs its own clipboard stub, so spy on that one.
    const writeText = vi.spyOn(navigator.clipboard, 'writeText')
    renderBrandPage()

    await user.click(screen.getByRole('button', { name: 'Copy Gold, #f0b429' }))

    expect(writeText).toHaveBeenCalledWith('#f0b429')
    await waitFor(() => expect(screen.getByText('Copied')).toBeInTheDocument())
  })

  it('stays quiet, without claiming a copy, when the clipboard is unavailable', async () => {
    const user = userEvent.setup()
    vi.spyOn(navigator.clipboard, 'writeText').mockRejectedValue(new Error('denied'))
    renderBrandPage()

    await user.click(screen.getByRole('button', { name: 'Copy Gold, #f0b429' }))

    expect(screen.queryByText('Copied')).not.toBeInTheDocument()
  })

  it('says it is independent of ether.fi', () => {
    renderBrandPage()
    expect(screen.getByText(/isn't affiliated with ether\.fi/i)).toBeInTheDocument()
  })

  it('links back to the home page', () => {
    renderBrandPage()
    expect(screen.getByRole('link', { name: /back to home/i })).toHaveAttribute('href', '/home')
  })
})
