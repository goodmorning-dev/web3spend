import { useSyncExternalStore } from 'react'

// How many imports (a real file, or the demo) are running right now, across
// the whole app. Module-level rather than React state so the update prompt,
// which lives at the app root, can see an import started anywhere below it.
let activeImports = 0
const listeners = new Set<() => void>()

function emit() {
  for (const listener of listeners) {
    listener()
  }
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/** Runs `work` counted as an import in progress, however it ends. */
export async function trackImport<T>(work: () => Promise<T>): Promise<T> {
  activeImports += 1
  emit()
  try {
    return await work()
  } finally {
    activeImports -= 1
    emit()
  }
}

/** True while any import is running; the app update prompt waits on it so
 * reloading for a new version can never cut an import off halfway. */
export function useImportInProgress(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => activeImports > 0,
    () => false,
  )
}
