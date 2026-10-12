import { afterEach, describe, expect, it } from 'vitest'
import { getMembershipLevel, getSettings, saveSettings, setMembershipLevel } from './settings'
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

describe('membership level', () => {
  it('is unset until picked, and can be forgotten again', async () => {
    expect(await getMembershipLevel()).toBeNull()

    await setMembershipLevel('luxe')
    expect(await getMembershipLevel()).toBe('luxe')

    await setMembershipLevel(null)
    expect(await getMembershipLevel()).toBeNull()
  })

  it('keeps the other settings when the level changes', async () => {
    await saveSettings({ currency: 'EUR', cardFilter: 'card-1' })

    await setMembershipLevel('core')

    expect(await getSettings()).toEqual({
      key: 'preferences',
      schemaVersion: 1,
      currency: 'EUR',
      cardFilter: 'card-1',
      membershipLevel: 'core',
    })
  })
})
