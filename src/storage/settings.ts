import { db } from './db'
import type { Settings } from '@/types/settings'

const SETTINGS_KEY = 'preferences'
const SCHEMA_VERSION = 1

export function getSettings(): Promise<Settings | undefined> {
  return db.settings.get(SETTINGS_KEY)
}

export function saveSettings(settings: Omit<Settings, 'key' | 'schemaVersion'>): Promise<string> {
  return db.settings.put({ key: SETTINGS_KEY, schemaVersion: SCHEMA_VERSION, ...settings })
}
