import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { UpdatePromptView } from './UpdatePrompt'

describe('UpdatePromptView', () => {
  it('offers a reload for the new version, or waiting until later', async () => {
    const user = userEvent.setup()
    const onReload = vi.fn()
    const onDismiss = vi.fn()

    render(<UpdatePromptView importing={false} onReload={onReload} onDismiss={onDismiss} />)

    expect(screen.getByRole('status')).toHaveTextContent('A new version of Web3Spend is ready.')
    await user.click(screen.getByRole('button', { name: 'Reload' }))
    expect(onReload).toHaveBeenCalledTimes(1)
    await user.click(screen.getByRole('button', { name: 'Later' }))
    expect(onDismiss).toHaveBeenCalledTimes(1)
  })

  it("won't reload while an import is running", () => {
    render(<UpdatePromptView importing onReload={vi.fn()} onDismiss={vi.fn()} />)

    expect(screen.getByRole('button', { name: 'Finishing import…' })).toBeDisabled()
    expect(screen.queryByRole('button', { name: 'Reload' })).not.toBeInTheDocument()
  })
})
