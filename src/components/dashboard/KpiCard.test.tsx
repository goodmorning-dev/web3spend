import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import KpiCard from './KpiCard'

describe('KpiCard', () => {
  it('shows the label and value, with the hint available for assistive tech even before hover', () => {
    render(<KpiCard icon={<svg />} label="Total spent" value="€28.40" hint="across 2 purchases" />)

    expect(screen.getByText('Total spent')).toBeInTheDocument()
    expect(screen.getByText('€28.40')).toBeInTheDocument()
    // the hint is present in the DOM (just visually hidden until hover/focus),
    // so it isn't lost to anyone not using a mouse
    expect(screen.getByText('across 2 purchases')).toBeInTheDocument()
  })

  it('shows an optional detail line under the value', () => {
    render(
      <KpiCard
        icon={<svg />}
        label="Monthly cost"
        value="€24.98"
        detail="2 active subscriptions"
        hint="latest charge of each active one, added up"
      />,
    )

    expect(screen.getByText('2 active subscriptions')).toBeVisible()
  })
})
