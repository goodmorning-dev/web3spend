import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'
import { getMembershipLevel, setMembershipLevel } from '@/storage/settings'
import { resetDatabase } from '@/storage/test-helpers'
import MembershipSection from './MembershipSection'

afterEach(resetDatabase)

/** Whole dollars the way the viewer's locale writes them, with the
 * non-breaking spaces some locales use collapsed, as Testing Library does
 * to the page's text. */
function dollars(amount: number): string {
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })
    .format(amount)
    .replace(/\s+/g, ' ')
}

describe('MembershipSection', () => {
  it("lists each level with its 3% limit, and saves the one that's picked", async () => {
    const user = userEvent.setup()
    render(<MembershipSection />)

    const luxe = await screen.findByRole('button', { name: /^Luxe/ })
    expect(luxe).toHaveTextContent(
      `3% on the first ${dollars(10_000)} a month (${dollars(3_000)} on euro purchases)`,
    )
    expect(luxe).toHaveAttribute('aria-pressed', 'false')

    await user.click(luxe)

    await waitFor(async () => expect(await getMembershipLevel()).toBe('luxe'))
    expect(await screen.findByRole('button', { name: /^Luxe/ })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
  })

  it('can forget the level again', async () => {
    await setMembershipLevel('core')
    const user = userEvent.setup()
    render(<MembershipSection />)

    await user.click(await screen.findByRole('button', { name: 'Clear my level' }))

    await waitFor(async () => expect(await getMembershipLevel()).toBeNull())
  })

  it("links to ether.fi's own explanation of the levels", () => {
    render(<MembershipSection />)

    expect(screen.getByRole('link', { name: 'How levels work' })).toHaveAttribute(
      'href',
      'https://help.ether.fi/en/articles/303625-how-do-membership-levels-work',
    )
  })
})
