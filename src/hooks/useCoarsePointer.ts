import { useSyncExternalStore } from 'react'

const QUERY = '(pointer: coarse)'

function subscribe(onChange: () => void): () => void {
  const query = window.matchMedia?.(QUERY)
  query?.addEventListener('change', onChange)
  return () => query?.removeEventListener('change', onChange)
}

function getSnapshot(): boolean {
  return window.matchMedia?.(QUERY).matches ?? false
}

/** True when the main input is a finger rather than a mouse: phones and
 * tablets, not a touchscreen laptop driven by its trackpad. Live, so it
 * follows a tablet being docked to a keyboard and mouse. */
export function useCoarsePointer(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, () => false)
}
