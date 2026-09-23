/**
 * MVP-PLAN §5: "request persistent storage when appropriate; handle refusal
 * and storage errors." Without persistence, a browser may clear a site's
 * IndexedDB on its own when the device runs low on space, taking someone's
 * whole imported history with it. With it, only the person can.
 */
export type PersistenceState = 'persisted' | 'not-persisted' | 'unsupported'

function storageManager(): StorageManager | undefined {
  return typeof navigator === 'undefined' ? undefined : navigator.storage
}

export async function getPersistenceState(): Promise<PersistenceState> {
  const storage = storageManager()
  if (!storage?.persisted) {
    return 'unsupported'
  }
  return (await storage.persisted()) ? 'persisted' : 'not-persisted'
}

/** Asks the browser to keep this site's data. Chrome and Edge decide on
 * their own (installed apps and frequent use count), Firefox asks the
 * person, and some browsers decline outright; this reports which way it
 * went. A no-op if the data is already being kept. */
export async function requestPersistentStorage(): Promise<PersistenceState> {
  const storage = storageManager()
  if (!storage?.persist || !storage.persisted) {
    return 'unsupported'
  }
  if (await storage.persisted()) {
    return 'persisted'
  }
  return (await storage.persist()) ? 'persisted' : 'not-persisted'
}

/** Roughly how much this site is storing, in bytes, when the browser says. */
export async function estimateUsageBytes(): Promise<number | null> {
  const storage = storageManager()
  if (!storage?.estimate) {
    return null
  }
  const { usage } = await storage.estimate()
  return usage ?? null
}

/** True for the error a write throws when the browser has no room left for
 * this site, whether it arrives as the raw DOMException or wrapped by
 * Dexie, which keeps the original as `inner`. */
export function isQuotaExceededError(error: unknown): boolean {
  let current: unknown = error
  for (let depth = 0; depth < 3 && current; depth++) {
    const name = (current as { name?: unknown }).name
    if (name === 'QuotaExceededError') {
      return true
    }
    current = (current as { inner?: unknown }).inner
  }
  return false
}

export const STORAGE_FULL_MESSAGE =
  "Your browser has run out of storage space for Web3Spend, so the import couldn't be saved. Nothing was changed. Free up some space on this device and try again."
