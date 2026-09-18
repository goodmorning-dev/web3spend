import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import VaultAnimation from './VaultAnimation'

describe('VaultAnimation', () => {
  it('is accessibly labeled as a diagram, for anyone not seeing the animation', () => {
    render(<VaultAnimation />)
    expect(
      screen.getByRole('img', { name: /transactions flowing in on separate lanes/i }),
    ).toBeInTheDocument()
    expect(screen.getByText('In. Sealed. Never back out.')).toBeInTheDocument()
  })
})
