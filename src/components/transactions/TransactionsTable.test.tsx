import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { StandardTransaction } from '@/types/transaction'
import TransactionsTable from './TransactionsTable'

function makeTransaction(overrides: Partial<StandardTransaction> = {}): StandardTransaction {
  return {
    id: 'txn-1',
    cardId: 'card-1',
    timestampUtc: '2026-03-15T10:00:00.000Z',
    type: 'card_spend',
    description: 'Coffee Shop',
    status: 'CLEARED',
    amountMinor: 450,
    currency: 'EUR',
    originalAmountMinor: 450,
    originalCurrency: 'EUR',
    cashbackMinor: 9,
    cashbackCurrency: 'EUR',
    categoryRaw: 'Groceries',
    spendingMode: 'Direct Pay',
    identityKey: 'key-1',
    importId: 'import-1',
    ...overrides,
  }
}

describe('TransactionsTable', () => {
  it('shows a fallback message instead of an empty table when nothing matches', () => {
    render(<TransactionsTable transactions={[]} cardLabelById={new Map()} />)
    expect(screen.getByText('No transactions match your filters.')).toBeInTheDocument()
  })

  it('resolves the card label and shows each transaction once per layout', () => {
    const transaction = makeTransaction()
    const cardLabelById = new Map([['card-1', 'Card ****1234']])

    render(<TransactionsTable transactions={[transaction]} cardLabelById={cardLabelById} />)

    // rendered twice: once in the mobile receipt list, once in the desktop
    // table, only one of which is visible at a given viewport width
    expect(screen.getAllByText('Coffee Shop')).toHaveLength(2)
    expect(screen.getAllByText('Cleared')).toHaveLength(2)
    // the mobile receipt list folds date/category/card into one line, so
    // the card label is only its own isolated text node in the desktop table
    expect(screen.getByText('Card ****1234')).toBeInTheDocument()
    expect(document.body.textContent).toContain('Card ****1234')
  })

  it('falls back to a placeholder when a transaction has no matching card', () => {
    const transaction = makeTransaction({ cardId: 'missing-card' })

    render(<TransactionsTable transactions={[transaction]} cardLabelById={new Map()} />)

    expect(screen.getByText('Unknown card')).toBeInTheDocument()
    expect(document.body.textContent).toContain('Unknown card')
  })
})
