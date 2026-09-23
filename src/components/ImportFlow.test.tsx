import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import ImportFlow from './ImportFlow'

describe('ImportFlow', () => {
  it('shows the import heading and the file picker', () => {
    render(<ImportFlow />)

    expect(screen.getByRole('heading', { name: /import your ether\.fi data/i })).toBeInTheDocument()
    expect(screen.getByLabelText(/choose an xlsx file/i)).toBeInTheDocument()
  })

  it("links to ether.fi's own guide on downloading a card transaction export", () => {
    render(<ImportFlow />)

    const link = screen.getByRole('link', { name: /ether\.fi.*guide/i })
    expect(link).toHaveAttribute(
      'href',
      'https://help.ether.fi/en/articles/685844-how-to-download-your-card-transaction-history',
    )
    expect(link).toHaveAttribute('target', '_blank')
  })
})
