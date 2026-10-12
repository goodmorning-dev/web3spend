import { db } from './db'
import type { MembershipLevel } from '@/cashback/ladders'
import type { Settings } from '@/types/settings'

const SETTINGS_KEY = 'preferences'
const SCHEMA_VERSION = 1

export function getSettings(): Promise<Settings | undefined> {
  return db.settings.get(SETTINGS_KEY)
}

export function saveSettings(settings: Omit<Settings, 'key' | 'schemaVersion'>): Promise<string> {
  return db.settings.put({ key: SETTINGS_KEY, schemaVersion: SCHEMA_VERSION, ...settings })
}

export async function getMembershipLevel(): Promise<MembershipLevel | null> {
  return (await getSettings())?.membershipLevel ?? null
}

/** Saves the person's ether.fi level, or forgets it with null, keeping
 * every other setting as it is. */
export async function setMembershipLevel(level: MembershipLevel | null): Promise<void> {
  await db.transaction('rw', db.settings, async () => {
    const next: Settings = {
      ...((await getSettings()) ?? { key: SETTINGS_KEY, schemaVersion: SCHEMA_VERSION }),
    }
    if (level === null) {
      delete next.membershipLevel
    } else {
      next.membershipLevel = level
    }
    await db.settings.put(next)
  })
}
