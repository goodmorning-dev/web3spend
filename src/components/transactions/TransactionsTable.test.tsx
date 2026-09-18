import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { StandardTransaction } from '@/types/transaction'
import { formatMoney } from '@/utils/format'
import TransactionsTable from './TransactionsTable'

// Testing Library's default text matcher collapses whitespace in the DOM
// text it compares against, but not in a plain-string matcher argument; a
// locale that formats money with a non-breaking space needs the same
// collapsing applied to the expected string to match.
function normalizeWhitespace(text: string): string {
  return text.replace(/\s+/g, ' ')
}

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

  it('labels a refund-like cleared row distinctly, not as an ordinary cleared purchase', () => {
    // MVP-PLAN §6: a CLEARED row with a negative amount is excluded from
    // every spend/cashback total; the status pill must say so rather than
    // reading exactly like a normal cleared purchase.
    const transaction = makeTransaction({ status: 'CLEARED', amountMinor: -400 })

    render(<TransactionsTable transactions={[transaction]} cardLabelById={new Map()} />)

    expect(screen.getAllByText('Refund-like')).toHaveLength(2)
    expect(screen.queryByText('Cleared')).not.toBeInTheDocument()
    expect(screen.getAllByTitle(/excluded from spend and cashback totals/i)).toHaveLength(2)
  })

  it('still labels an ordinary positive-amount cleared row as Cleared', () => {
    const transaction = makeTransaction({ status: 'CLEARED', amountMinor: 450 })

    render(<TransactionsTable transactions={[transaction]} cardLabelById={new Map()} />)

    expect(screen.getAllByText('Cleared')).toHaveLength(2)
    expect(screen.queryByText('Refund-like')).not.toBeInTheDocument()
  })

  it('shows recorded cashback, in its own currency, on the mobile receipt layout too', () => {
    const transaction = makeTransaction({ cashbackMinor: 9, cashbackCurrency: 'EUR' })

    render(<TransactionsTable transactions={[transaction]} cardLabelById={new Map()} />)

    // one match per layout (mobile receipt list, desktop table); previously
    // the mobile layout omitted cashback entirely
    expect(screen.getAllByText(normalizeWhitespace(formatMoney(9, 'EUR')))).toHaveLength(2)
  })

  it("makes a transaction's original amount inspectable when it differs from the settled amount", () => {
    const transaction = makeTransaction({
      amountMinor: 450,
      currency: 'EUR',
      originalAmountMinor: 500,
      originalCurrency: 'USD',
    })

    render(<TransactionsTable transactions={[transaction]} cardLabelById={new Map()} />)

    expect(screen.getAllByText('Original amount')).toHaveLength(2)
    expect(screen.getAllByText(normalizeWhitespace(formatMoney(500, 'USD')))).toHaveLength(2)
  })

  it('shows no original-amount disclosure when it matches the settled amount and currency', () => {
    const transaction = makeTransaction({
      amountMinor: 450,
      currency: 'EUR',
      originalAmountMinor: 450,
      originalCurrency: 'EUR',
    })

    render(<TransactionsTable transactions={[transaction]} cardLabelById={new Map()} />)

    expect(screen.queryByText('Original amount')).not.toBeInTheDocument()
  })
})
