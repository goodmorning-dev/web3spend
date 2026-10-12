import { useLiveQuery } from 'dexie-react-hooks'
import type { MembershipLevel } from '@/cashback/ladders'
import { getMembershipLevel } from '@/storage/settings'
import { useDataSource } from './useDataSource'

/** The person's ether.fi level as saved in Settings: null when it isn't
 * set, undefined while it's still being read. Live, so picking a level
 * updates the dashboard straight away. */
export function useMembershipLevel(): MembershipLevel | null | undefined {
  const source = useDataSource()
  return useLiveQuery(getMembershipLevel, [source])
}
