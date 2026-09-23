import { afterEach, describe, expect, it, vi } from 'vitest'
import { getPersistenceState, isQuotaExceededError, requestPersistentStorage } from './persistence'

function fakeStorage(overrides: Partial<StorageManager>) {
  Object.defineProperty(navigator, 'storage', {
    configurable: true,
    value: overrides as StorageManager,
  })
}

afterEach(() => {
  // jsdom has no StorageManager of its own
  Reflect.deleteProperty(navigator, 'storage')
})

describe('getPersistenceState / requestPersistentStorage', () => {
  it('reports unsupported where the browser has no storage manager', async () => {
    expect(await getPersistenceState()).toBe('unsupported')
    expect(await requestPersistentStorage()).toBe('unsupported')
  })

  it("doesn't ask again once the data is already being kept", async () => {
    const persist = vi.fn()
    fakeStorage({ persisted: async () => true, persist })

    expect(await getPersistenceState()).toBe('persisted')
    expect(await requestPersistentStorage()).toBe('persisted')
    expect(persist).not.toHaveBeenCalled()
  })

  it("asks when the data isn't kept yet, and reports the browser's answer", async () => {
    fakeStorage({ persisted: async () => false, persist: async () => true })
    expect(await requestPersistentStorage()).toBe('persisted')

    fakeStorage({ persisted: async () => false, persist: async () => false })
    expect(await requestPersistentStorage()).toBe('not-persisted')
  })
})

describe('isQuotaExceededError', () => {
  it('recognizes the raw browser error and one wrapped by Dexie', () => {
    const raw = new DOMException('The quota has been exceeded.', 'QuotaExceededError')
    expect(isQuotaExceededError(raw)).toBe(true)
    expect(isQuotaExceededError({ name: 'AbortError', inner: raw })).toBe(true)
  })

  it('ignores every other error', () => {
    expect(isQuotaExceededError(new Error('Workbook has no "All Transactions" sheet.'))).toBe(false)
    expect(isQuotaExceededError(undefined)).toBe(false)
  })
})
