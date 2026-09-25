import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { StandardTransaction } from '@/types/transaction'
import { formatUtcDate, formatUtcDateTime } from '@/utils/dates'
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
    render(<TransactionsTable transactions={[]} cardLastFourById={new Map()} />)
    expect(screen.getByText('No transactions match your filters.')).toBeInTheDocument()
  })

  it("shows the card's last 4 digits, design-reference style, and each transaction once per layout", () => {
    const transaction = makeTransaction()
    const cardLastFourById = new Map([['card-1', '1234']])

    render(<TransactionsTable transactions={[transaction]} cardLastFourById={cardLastFourById} />)

    // rendered twice: once in the mobile receipt list, once in the desktop
    // table, only one of which is visible at a given viewport width
    expect(screen.getAllByText('Coffee Shop')).toHaveLength(2)
    expect(screen.getAllByText('Settled')).toHaveLength(2)
    expect(screen.getAllByText('•••• 1234')).toHaveLength(2)
    expect(document.body.textContent).toContain('•••• 1234')
  })

  it('falls back to a placeholder when a transaction has no matching card', () => {
    const transaction = makeTransaction({ cardId: 'missing-card' })

    render(<TransactionsTable transactions={[transaction]} cardLastFourById={new Map()} />)

    expect(screen.getAllByText('Unknown card')).toHaveLength(2)
    expect(document.body.textContent).toContain('Unknown card')
  })

  it('labels a refund-like cleared row distinctly, not as an ordinary cleared purchase', () => {
    // MVP-PLAN §6: a CLEARED row with a negative amount is excluded from
    // every spend/cashback total; the status pill must say so rather than
    // reading exactly like a normal cleared purchase.
    const transaction = makeTransaction({ status: 'CLEARED', amountMinor: -400 })

    render(<TransactionsTable transactions={[transaction]} cardLastFourById={new Map()} />)

    expect(screen.getAllByText('Refund-like')).toHaveLength(2)
    expect(screen.queryByText('Settled')).not.toBeInTheDocument()
    expect(screen.getAllByTitle(/excluded from spend and cashback totals/i)).toHaveLength(2)
  })

  it('still labels an ordinary positive-amount cleared row as Settled', () => {
    const transaction = makeTransaction({ status: 'CLEARED', amountMinor: 450 })

    render(<TransactionsTable transactions={[transaction]} cardLastFourById={new Map()} />)

    expect(screen.getAllByText('Settled')).toHaveLength(2)
    expect(screen.queryByText('Refund-like')).not.toBeInTheDocument()
  })

  it('shows spend with a leading "-" and cashback with a leading "+", matching the design reference', () => {
    const transaction = makeTransaction({ amountMinor: 450, cashbackMinor: 9, currency: 'EUR' })

    render(<TransactionsTable transactions={[transaction]} cardLastFourById={new Map()} />)

    const spendText = `-${formatMoney(450, 'EUR')}`.replace(/\s+/g, ' ')
    const cashbackText = `+${formatMoney(9, 'EUR')}`.replace(/\s+/g, ' ')
    expect(screen.getAllByText(spendText)).toHaveLength(2)
    expect(screen.getAllByText(cashbackText)).toHaveLength(2)
  })

  it('shows a refund-like (already negative) amount with its own sign, not a second leading "-"', () => {
    const transaction = makeTransaction({ status: 'CLEARED', amountMinor: -400, currency: 'EUR' })

    render(<TransactionsTable transactions={[transaction]} cardLastFourById={new Map()} />)

    const expected = formatMoney(-400, 'EUR').replace(/\s+/g, ' ')
    expect(expected.match(/-/g)).toHaveLength(1) // sanity: formatMoney's own single sign
    expect(screen.getAllByText(expected)).toHaveLength(2)
  })

  it('shows only the merchant name, with no avatar or initials badge', () => {
    const transaction = makeTransaction({ description: 'Coffee Shop' })

    render(<TransactionsTable transactions={[transaction]} cardLastFourById={new Map()} />)

    expect(screen.getAllByText('Coffee Shop')).toHaveLength(2)
    expect(screen.queryByText('CS')).not.toBeInTheDocument()
  })

  it("shows the transaction's exact time in a chart-style tooltip on hover, not a native title", async () => {
    const iso = '2026-03-15T10:30:45.000Z'
    const transaction = makeTransaction({ timestampUtc: iso })

    render(<TransactionsTable transactions={[transaction]} cardLastFourById={new Map()} />)

    const dateCells = screen.getAllByText(formatUtcDate(iso))
    expect(dateCells).toHaveLength(2)
    for (const cell of dateCells) {
      expect(cell).not.toHaveAttribute('title')
    }

    const exactTime = formatUtcDateTime(iso)
    expect(screen.queryByText(exactTime)).not.toBeInTheDocument()

    fireEvent.mouseEnter(dateCells[0])
    expect(screen.getByText(exactTime)).toBeInTheDocument()

    fireEvent.mouseLeave(dateCells[0])
    // the clear is deliberately debounced, same reasoning as the donut and
    // the heatmap tooltips, so it doesn't happen synchronously with mouseleave.
    await waitFor(() => {
      expect(screen.queryByText(exactTime)).not.toBeInTheDocument()
    })
  })

  it('makes the exact time reachable by keyboard, and always available to a screen reader', async () => {
    const iso = '2026-03-15T10:30:45.000Z'
    const transaction = makeTransaction({ timestampUtc: iso })

    render(<TransactionsTable transactions={[transaction]} cardLastFourById={new Map()} />)

    const exactTime = formatUtcDateTime(iso)
    // a focusable button, not inert text, and its accessible name carries
    // the full timestamp regardless of whether the visual tooltip is showing
    const dateButtons = screen.getAllByRole('button', { name: exactTime })
    expect(dateButtons).toHaveLength(2)

    expect(screen.queryByText(exactTime)).not.toBeInTheDocument()

    fireEvent.focus(dateButtons[0])
    expect(screen.getByText(exactTime)).toBeInTheDocument()

    fireEvent.blur(dateButtons[0])
    await waitFor(() => {
      expect(screen.queryByText(exactTime)).not.toBeInTheDocument()
    })
  })

  it('shows the effective cashback rate next to the cashback amount', () => {
    // 9 minor units of cashback on 450 minor units of spend is exactly 2%.
    const transaction = makeTransaction({ amountMinor: 450, cashbackMinor: 9, currency: 'EUR' })

    render(<TransactionsTable transactions={[transaction]} cardLastFourById={new Map()} />)

    expect(screen.getAllByText('(2.0%)')).toHaveLength(2)
  })

  it('shows no cashback rate when the cashback currency does not match the spend currency', () => {
    const transaction = makeTransaction({
      amountMinor: 450,
      currency: 'EUR',
      cashbackMinor: 9,
      cashbackCurrency: 'USD',
    })

    render(<TransactionsTable transactions={[transaction]} cardLastFourById={new Map()} />)

    expect(screen.queryByText(/\(\d/)).not.toBeInTheDocument()
  })

  it("makes a transaction's original amount inspectable when it differs from the settled amount", () => {
    const transaction = makeTransaction({
      amountMinor: 450,
      currency: 'EUR',
      originalAmountMinor: 500,
      originalCurrency: 'USD',
    })

    render(<TransactionsTable transactions={[transaction]} cardLastFourById={new Map()} />)

    expect(screen.getAllByText('Original amount')).toHaveLength(2)
    expect(screen.getAllByText(normalizeWhitespace(formatMoney(500, 'USD')))).toHaveLength(2)
  })

  it('shows a category without its leading MCC code', () => {
    const transaction = makeTransaction({
      categoryRaw: '5411 - Grocery Stores and Supermarkets',
    })

    render(<TransactionsTable transactions={[transaction]} cardLastFourById={new Map()} />)

    expect(screen.getAllByText('Grocery Stores and Supermarkets')).toHaveLength(2)
    expect(screen.queryByText('5411 - Grocery Stores and Supermarkets')).not.toBeInTheDocument()
  })

  it('shows no original-amount disclosure when it matches the settled amount and currency', () => {
    const transaction = makeTransaction({
      amountMinor: 450,
      currency: 'EUR',
      originalAmountMinor: 450,
      originalCurrency: 'EUR',
    })

    render(<TransactionsTable transactions={[transaction]} cardLastFourById={new Map()} />)

    expect(screen.queryByText('Original amount')).not.toBeInTheDocument()
  })

  it('shows whether each purchase was paid directly or in Borrow Mode, in both layouts', () => {
    render(
      <TransactionsTable
        transactions={[
          makeTransaction({ id: 'direct', description: 'Paid directly' }),
          makeTransaction({
            id: 'borrow',
            description: 'Paid by borrowing',
            spendingMode: 'Borrow Mode',
          }),
        ]}
        cardLastFourById={new Map()}
      />,
    )

    expect(screen.getByRole('columnheader', { name: 'Mode' })).toBeInTheDocument()
    // once in the phone list, once in the desktop table
    expect(screen.getAllByText('Direct')).toHaveLength(2)
    const borrowTags = screen.getAllByText('Borrow')
    expect(borrowTags).toHaveLength(2)
    for (const tag of borrowTags) {
      expect(tag).toHaveAttribute('title', 'Borrow Mode')
    }
  })

  it("colors each category's dot like the donut, and others in a color of their own", () => {
    const { container } = render(
      <TransactionsTable
        transactions={[
          makeTransaction({ id: 'txn-1', categoryRaw: '5732 - Electronics Stores' }),
          makeTransaction({ id: 'txn-2', categoryRaw: 'Fast Food Restaurants' }),
        ]}
        cardLastFourById={new Map()}
        categoryColors={new Map([['electronics stores', 'var(--color-chart-6)']])}
      />,
    )

    const dotColors = [
      ...container.querySelectorAll('tbody span[aria-hidden="true"][style*="background-color"]'),
    ].map((dot) => (dot as HTMLElement).style.backgroundColor)
    expect(dotColors[0]).toBe('var(--color-chart-6)')
    expect(dotColors[1]).not.toBe('var(--color-chart-5)')
    expect(dotColors[1]).not.toBe('var(--color-chart-6)')
  })
})
