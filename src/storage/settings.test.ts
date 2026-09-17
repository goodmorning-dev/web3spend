import { afterEach, describe, expect, it } from 'vitest'
import { getSettings, saveSettings } from './settings'
import { resetDatabase } from './test-helpers'

afterEach(resetDatabase)

describe('settings repository', () => {
  it('has no settings before anything is saved', async () => {
    expect(await getSettings()).toBeUndefined()
  })

  it('saves and retrieves settings under the fixed preferences key', async () => {
    await saveSettings({ currency: 'USD', periodFilter: '2026-01' })

    expect(await getSettings()).toEqual({
      key: 'preferences',
      schemaVersion: 1,
      currency: 'USD',
      periodFilter: '2026-01',
    })
  })

  it('overwrites previous settings rather than merging', async () => {
    await saveSettings({ currency: 'USD', cardFilter: 'card-1' })
    await saveSettings({ currency: 'EUR' })

    expect(await getSettings()).toEqual({
      key: 'preferences',
      schemaVersion: 1,
      currency: 'EUR',
    })
  })
})
