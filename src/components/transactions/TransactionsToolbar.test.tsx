import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import TransactionsToolbar from './TransactionsToolbar'

const STATUS_OPTIONS = [
  { value: 'all', label: 'All statuses' },
  { value: 'CLEARED', label: 'Cleared' },
]
const CATEGORY_OPTIONS = [
  { value: 'all', label: 'All categories' },
  { value: 'Groceries', label: 'Groceries' },
]

function ControlledSearch() {
  const [search, setSearch] = useState('')
  return (
    <TransactionsToolbar
      search={search}
      onSearchChange={setSearch}
      status="all"
      statusOptions={STATUS_OPTIONS}
      onStatusChange={vi.fn()}
      category="all"
      categoryOptions={CATEGORY_OPTIONS}
      onCategoryChange={vi.fn()}
    />
  )
}

describe('TransactionsToolbar', () => {
  it('reports search text as the user types', async () => {
    const user = userEvent.setup()

    render(<ControlledSearch />)

    const input = screen.getByRole('textbox', { name: /search by merchant/i })
    await user.type(input, 'coffee')
    expect(input).toHaveValue('coffee')
    // leaving this focused confuses a Select in a later test's focus
    // handling once this input is unmounted (see src/test/setup.ts)
    input.blur()
  })

  it('reports the chosen status and category', async () => {
    const user = userEvent.setup()
    const onStatusChange = vi.fn()
    const onCategoryChange = vi.fn()

    render(
      <TransactionsToolbar
        search=""
        onSearchChange={vi.fn()}
        status="all"
        statusOptions={STATUS_OPTIONS}
        onStatusChange={onStatusChange}
        category="all"
        categoryOptions={CATEGORY_OPTIONS}
        onCategoryChange={onCategoryChange}
      />,
    )

    await user.click(screen.getByRole('combobox', { name: 'Status' }))
    await user.click(await screen.findByRole('option', { name: 'Cleared' }))
    expect(onStatusChange).toHaveBeenCalledWith('CLEARED')

    await user.click(screen.getByRole('combobox', { name: 'Category' }))
    await user.click(await screen.findByRole('option', { name: 'Groceries' }))
    expect(onCategoryChange).toHaveBeenCalledWith('Groceries')
  })
})
