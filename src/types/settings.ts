import type { MembershipLevel } from '@/cashback/ladders'

export interface Settings {
  key: string
  currency?: string
  periodFilter?: string
  cardFilter?: string
  /** The person's ether.fi membership level, for the cashback steps on the
   * dashboard. Unset until they pick it: the export doesn't say. */
  membershipLevel?: MembershipLevel
  schemaVersion: number
}
