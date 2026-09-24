import { useLiveQuery } from 'dexie-react-hooks'
import { useSyncExternalStore } from 'react'
import { getDataSource, subscribeToDataSource, type DataSource } from '@/storage/dataSource'
import { hasRealData } from '@/storage/demoData'

/** Which dataset is on screen, re-rendering whenever it switches. Every
 * live query over `db` includes this in its dependencies, so switching
 * re-runs it against the other database. */
export function useDataSource(): DataSource {
  return useSyncExternalStore(subscribeToDataSource, getDataSource, getDataSource)
}

/** Whether the person has imported any real data, whichever dataset is on
 * screen; undefined while that's still being read. */
export function useHasRealData(): boolean | undefined {
  return useLiveQuery(hasRealData)
}
