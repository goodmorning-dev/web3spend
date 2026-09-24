import { demoDb, realDb, setActiveDatabase } from './db'

/**
 * Which dataset the app is showing: the person's own imports, or the
 * synthetic demo. Each lives in its own database (see db.ts), so the demo
 * can be opened at any time, with or without real data, and the two never
 * mix.
 *
 * The choice is remembered for this tab's session only. A reload keeps the
 * demo on screen, but the app always opens on the person's own data, so
 * demo numbers are never mistaken for theirs after coming back later.
 */
export type DataSource = 'real' | 'demo'

const SESSION_KEY = 'web3spend:data-source'

const listeners = new Set<() => void>()
let current: DataSource = readSessionSource()
setActiveDatabase(current === 'demo' ? demoDb : realDb)

function readSessionSource(): DataSource {
  try {
    return sessionStorage.getItem(SESSION_KEY) === 'demo' ? 'demo' : 'real'
  } catch {
    return 'real'
  }
}

export function getDataSource(): DataSource {
  return current
}

export function setDataSource(next: DataSource): void {
  if (next === current) {
    return
  }
  current = next
  setActiveDatabase(next === 'demo' ? demoDb : realDb)
  try {
    if (next === 'demo') {
      sessionStorage.setItem(SESSION_KEY, 'demo')
    } else {
      sessionStorage.removeItem(SESSION_KEY)
    }
  } catch {
    // Storage can be refused (some private modes); the switch still holds
    // until the page is reloaded.
  }
  for (const listener of listeners) {
    listener()
  }
}

export function subscribeToDataSource(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}
