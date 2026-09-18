import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import FilterSelect from './FilterSelect'

describe('FilterSelect', () => {
  it('shows the label matching the current value', () => {
    render(
      <FilterSelect
        ariaLabel="Currency"
        value="EUR"
        onChange={() => {}}
        options={[
          { value: 'EUR', label: 'EUR' },
          { value: 'USD', label: 'USD' },
        ]}
      />,
    )

    expect(screen.getByRole('combobox', { name: 'Currency' })).toHaveTextContent('EUR')
  })

  it('calls onChange with the newly selected option', async () => {
    const user = userEvent.setup()
    const handleChange = vi.fn()

    render(
      <FilterSelect
        ariaLabel="Currency"
        value="EUR"
        onChange={handleChange}
        options={[
          { value: 'EUR', label: 'EUR' },
          { value: 'USD', label: 'USD' },
        ]}
      />,
    )

    await user.click(screen.getByRole('combobox', { name: 'Currency' }))
    await user.click(await screen.findByRole('option', { name: 'USD' }))

    expect(handleChange).toHaveBeenCalledWith('USD')
  })

  it('applies a fixed trigger width so picking a shorter value never resizes it', () => {
    render(
      <FilterSelect
        ariaLabel="Currency"
        value="EUR"
        onChange={() => {}}
        options={[
          { value: 'EUR', label: 'EUR' },
          { value: 'USD', label: 'USD' },
        ]}
        triggerClassName="min-w-[92px]"
      />,
    )

    expect(screen.getByRole('combobox', { name: 'Currency' }).className).toContain('min-w-[92px]')
  })
})
