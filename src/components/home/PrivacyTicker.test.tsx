import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import PrivacyTicker from './PrivacyTicker'

describe('PrivacyTicker', () => {
  it('is hidden from assistive tech, since it only repeats copy stated elsewhere', () => {
    const { container } = render(<PrivacyTicker />)
    expect(container.firstElementChild).toHaveAttribute('aria-hidden', 'true')
  })

  it('lists each privacy fact, duplicated once for a seamless scroll loop', () => {
    render(<PrivacyTicker />)
    expect(screen.getAllByText(/no account/i)).toHaveLength(2)
    expect(screen.getAllByText(/stored in your browser/i)).toHaveLength(2)
  })
})
