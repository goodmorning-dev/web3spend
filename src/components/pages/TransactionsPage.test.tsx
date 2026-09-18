import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import TransactionsPage from './TransactionsPage'

describe('TransactionsPage', () => {
  it('shows a placeholder heading', () => {
    render(<TransactionsPage />)
    expect(screen.getByRole('heading', { name: 'Transactions' })).toBeInTheDocument()
  })
})
