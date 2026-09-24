import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import MobileTabBar from './MobileTabBar'

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <MobileTabBar />
    </MemoryRouter>,
  )
}

// jsdom doesn't lay anything out, so give the page a height to scroll
// through and drive window.scrollY by hand.
function scrollTo(y: number) {
  act(() => {
    window.scrollY = y
    fireEvent.scroll(window)
  })
}

beforeEach(() => {
  Object.defineProperty(document.documentElement, 'scrollHeight', {
    configurable: true,
    value: 3000,
  })
  Object.defineProperty(window, 'scrollY', { configurable: true, writable: true, value: 0 })
})

afterEach(() => {
  window.scrollY = 0
})

describe('MobileTabBar', () => {
  it('links all five tabs, Settings included', () => {
    renderAt('/app')

    expect(screen.getByRole('link', { name: 'Dashboard' })).toHaveAttribute('href', '/app')
    expect(screen.getByRole('link', { name: 'Transactions' })).toHaveAttribute(
      'href',
      '/app/transactions',
    )
    expect(screen.getByRole('link', { name: 'Subscriptions' })).toHaveAttribute(
      'href',
      '/app/subscriptions',
    )
    expect(screen.getByRole('link', { name: 'Import' })).toHaveAttribute('href', '/app/import')
    expect(screen.getByRole('link', { name: 'Settings' })).toHaveAttribute('href', '/app/settings')
  })

  it('marks only the current tab active', () => {
    renderAt('/app/subscriptions')

    expect(screen.getByRole('link', { name: 'Subscriptions' })).toHaveAttribute(
      'aria-current',
      'page',
    )
    expect(screen.getByRole('link', { name: 'Dashboard' })).not.toHaveAttribute('aria-current')
  })

  it('shrinks on scroll down and expands again on scroll up', async () => {
    renderAt('/app')
    const bar = screen.getByRole('navigation', { name: 'Tab bar' })
    expect(bar).toHaveAttribute('data-collapsed', 'false')

    scrollTo(400)
    await waitFor(() => expect(bar).toHaveAttribute('data-collapsed', 'true'))
    // labels stay in the DOM while collapsed, so every tab keeps its name
    expect(screen.getByRole('link', { name: 'Transactions' })).toBeInTheDocument()

    scrollTo(300)
    await waitFor(() => expect(bar).toHaveAttribute('data-collapsed', 'false'))
  })

  it('stays expanded near the top of the page and ignores tiny movements', async () => {
    renderAt('/app')
    const bar = screen.getByRole('navigation', { name: 'Tab bar' })

    scrollTo(30)
    scrollTo(400)
    await waitFor(() => expect(bar).toHaveAttribute('data-collapsed', 'true'))

    // a few pixels back up isn't a change of direction yet
    scrollTo(396)
    await new Promise((resolve) => setTimeout(resolve, 50))
    expect(bar).toHaveAttribute('data-collapsed', 'true')

    scrollTo(20)
    await waitFor(() => expect(bar).toHaveAttribute('data-collapsed', 'false'))
  })

  it('opens a new page with the bar expanded', async () => {
    renderAt('/app')
    const bar = screen.getByRole('navigation', { name: 'Tab bar' })
    scrollTo(400)
    await waitFor(() => expect(bar).toHaveAttribute('data-collapsed', 'true'))

    fireEvent.click(screen.getByRole('link', { name: 'Transactions' }))

    await waitFor(() => expect(bar).toHaveAttribute('data-collapsed', 'false'))
    expect(screen.getByRole('link', { name: 'Transactions' })).toHaveAttribute(
      'aria-current',
      'page',
    )
  })

  it('glides back to the top when the tab already open is tapped again', async () => {
    const scrollTo = vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
    renderAt('/app/transactions')

    fireEvent.click(screen.getByRole('link', { name: 'Dashboard' }))
    expect(scrollTo).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('link', { name: 'Dashboard' }))
    expect(scrollTo).toHaveBeenCalledWith({ top: 0, left: 0, behavior: 'smooth' })
    scrollTo.mockRestore()
  })
})
