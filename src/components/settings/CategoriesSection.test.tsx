import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it } from 'vitest'
import { createCategory, listCategories, setMerchantRule } from '@/storage/categories'
import { resetDatabase } from '@/storage/test-helpers'
import CategoriesSection from './CategoriesSection'

afterEach(resetDatabase)

function renderSection() {
  return render(
    <MemoryRouter>
      <CategoriesSection />
    </MemoryRouter>,
  )
}

describe('CategoriesSection', () => {
  it('adds a category', async () => {
    const user = userEvent.setup()
    renderSection()

    await user.type(screen.getByLabelText('New category name'), 'Gaming')
    await user.click(screen.getByRole('button', { name: 'Add' }))

    expect(await screen.findByText('Gaming')).toBeInTheDocument()
    expect(screen.getByLabelText('New category name')).toHaveValue('')
  })

  it('renames a category, and says so when the name is already taken', async () => {
    await createCategory('Gaming')
    await createCategory('Treats')
    const user = userEvent.setup()
    renderSection()

    await user.click(await screen.findByRole('button', { name: 'Rename Gaming' }))
    const input = screen.getByLabelText('New name for Gaming')
    await user.clear(input)
    await user.type(input, 'treats')
    await user.click(screen.getByRole('button', { name: 'Save name' }))
    expect(await screen.findByRole('alert')).toHaveTextContent(/already have a category/i)

    await user.clear(input)
    await user.type(input, 'Games')
    await user.click(screen.getByRole('button', { name: 'Save name' }))
    expect(await screen.findByText('Games')).toBeInTheDocument()
  })

  it('shows the rules of a category, removes one, and deletes the category after confirming', async () => {
    const gaming = await createCategory('Gaming')
    await setMerchantRule('Steam Purchase', gaming.id)
    const user = userEvent.setup()
    renderSection()

    expect(await screen.findByText('Steam Purchase')).toBeInTheDocument()
    expect(screen.getByText('No purchases yet')).toBeInTheDocument()
    await user.click(
      screen.getByRole('button', { name: 'Stop filing Steam Purchase under Gaming' }),
    )
    await waitFor(() => expect(screen.queryByText('Steam Purchase')).not.toBeInTheDocument())

    await user.click(screen.getByRole('button', { name: 'Delete Gaming' }))
    await user.click(await screen.findByRole('button', { name: 'Delete category' }))
    await waitFor(() => expect(screen.queryByText('Gaming')).not.toBeInTheDocument())
    expect(await listCategories()).toEqual([])
  })

  it('picks a color for a category, and puts it back to automatic', async () => {
    await createCategory('Gaming')
    const user = userEvent.setup()
    renderSection()

    await user.click(await screen.findByRole('button', { name: 'Change the color of Gaming' }))
    await user.click(await screen.findByRole('button', { name: 'Teal' }))
    await waitFor(async () => expect((await listCategories())[0].color).toBe('#2dd4bf'))

    await user.click(screen.getByRole('button', { name: 'Change the color of Gaming' }))
    expect(await screen.findByRole('button', { name: 'Teal' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    await user.click(screen.getByRole('button', { name: 'Back to automatic' }))
    await waitFor(async () => expect((await listCategories())[0].color).toBeUndefined())
  })
})
