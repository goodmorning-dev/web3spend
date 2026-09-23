import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
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

describe('FilterSelect on a touch screen', () => {
  const options = [
    { value: 'all', label: 'All cards' },
    { value: 'card-1', label: 'Card ••••1234' },
  ]

  function pretendTouchScreen() {
    vi.stubGlobal(
      'matchMedia',
      vi.fn((query: string) => ({
        matches: query === '(pointer: coarse)',
        media: query,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
    )
  }

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('uses a real select, so the phone opens its own picker, while showing the same label', () => {
    pretendTouchScreen()

    render(<FilterSelect ariaLabel="Card" value="all" onChange={() => {}} options={options} />)

    const select = screen.getByRole('combobox', { name: 'Card' })
    expect(select.tagName).toBe('SELECT')
    expect(select).toHaveValue('all')
    expect(screen.getAllByRole('option').map((option) => option.textContent)).toEqual([
      'All cards',
      'Card ••••1234',
    ])
    expect(select.parentElement).toHaveTextContent('All cards')
  })

  it('reports the picked option through onChange', async () => {
    pretendTouchScreen()
    const user = userEvent.setup()
    const handleChange = vi.fn()

    render(<FilterSelect ariaLabel="Card" value="all" onChange={handleChange} options={options} />)
    await user.selectOptions(screen.getByRole('combobox', { name: 'Card' }), 'card-1')

    expect(handleChange).toHaveBeenCalledWith('card-1')
  })

  it("keeps the select's text at 16px, so iOS doesn't zoom the page in when it's tapped", () => {
    pretendTouchScreen()

    render(<FilterSelect ariaLabel="Card" value="all" onChange={() => {}} options={options} />)

    expect(screen.getByRole('combobox', { name: 'Card' })).toHaveClass('text-base')
  })
})
