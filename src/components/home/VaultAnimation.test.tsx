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

  it('keeps each chip on its own static lane, separate from its animated horizontal move', () => {
    // a CSS transform (the slide animation) replaces an element's SVG
    // transform attribute entirely rather than composing with it, so the
    // static translate(0, laneY) that positions a chip on its lane has to
    // live on an outer group, never the same element the animation class
    // is on; putting them on one element collapsed every chip to y=0.
    render(<VaultAnimation />)

    const expectedLanes: Record<string, number> = {
      '−€3.40 Coffee': 82,
      '+€0.62 Cashback': 120,
      '−€41 Groceries': 158,
    }

    for (const [label, y] of Object.entries(expectedLanes)) {
      const text = screen.getByText(label)
      const animatedGroup = text.closest('g')
      const laneGroup = animatedGroup?.parentElement

      expect(laneGroup?.tagName.toLowerCase()).toBe('g')
      expect(laneGroup).toHaveAttribute('transform', `translate(0,${y})`)
      expect(animatedGroup).not.toHaveAttribute('transform')
    }
  })
})
