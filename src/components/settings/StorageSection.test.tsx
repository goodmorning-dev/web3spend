import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'
import StorageSection from './StorageSection'

function fakeStorage(overrides: Partial<StorageManager>) {
  Object.defineProperty(navigator, 'storage', {
    configurable: true,
    value: { estimate: async () => ({ usage: 2.5 * 1024 * 1024 }), ...overrides } as StorageManager,
  })
}

afterEach(() => {
  Reflect.deleteProperty(navigator, 'storage')
})

describe('StorageSection', () => {
  it('says when the data is being kept, and how much is stored', async () => {
    fakeStorage({ persisted: async () => true })

    render(<StorageSection />)

    expect(await screen.findByText('Your data is set to be kept.')).toBeInTheDocument()
    expect(screen.getByText('Using about 2.5 MB on this device.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /keep my data/i })).not.toBeInTheDocument()
  })

  it('offers to ask the browser to keep the data, and shows when it agrees', async () => {
    const user = userEvent.setup()
    fakeStorage({ persisted: async () => false, persist: async () => true })

    render(<StorageSection />)
    expect(await screen.findByText(/may clear this data on its own/i)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /keep my data/i }))

    expect(await screen.findByText('Your data is set to be kept.')).toBeInTheDocument()
  })

  it('explains what can change a no', async () => {
    const user = userEvent.setup()
    fakeStorage({ persisted: async () => false, persist: async () => false })

    render(<StorageSection />)
    await user.click(await screen.findByRole('button', { name: /keep my data/i }))

    expect(await screen.findByText(/your browser said no for now/i)).toBeInTheDocument()
  })

  it("says so plainly when the browser can't be asked at all", async () => {
    render(<StorageSection />)

    expect(await screen.findByText(/doesn't let sites ask to keep their data/i)).toBeInTheDocument()
  })
})
