import { useLiveQuery } from 'dexie-react-hooks'
import { useCallback, useEffect, useMemo } from 'react'
import { db } from './db'

/** All user settings with their defaults. Stored one row per key. */
export const defaultSettings = {
  profileName: '',
  accentColor: '#4f46e5',
  /** date-fns format used for short dates across the app */
  dateFormat: 'd MMM yyyy',
  weekStartsOn: 1 as 0 | 1,
  /** Screen shown when the app opens. */
  startScreen: 'home' as 'home' | 'board' | 'last',
  lastScreen: 'home' as 'home' | 'board',
  rotateBackground: true,
  /** Legacy data has been imported (or dismissed) on this device. */
  legacyMigrationDone: false,
}

export type Settings = typeof defaultSettings
export type SettingKey = keyof Settings

export async function setSetting<K extends SettingKey>(key: K, value: Settings[K]) {
  await db.settings.put({ id: key, value, updatedAt: Date.now() })
}

export async function getSettings(): Promise<Settings> {
  const rows = await db.settings.toArray()
  const out: Record<string, unknown> = { ...defaultSettings }
  for (const row of rows) if (row.id in defaultSettings) out[row.id] = row.value
  return out as Settings
}

/** Live settings (defaults until loaded) plus a setter. */
export function useSettings() {
  const rows = useLiveQuery(() => db.settings.toArray(), [])
  const settings = useMemo(() => {
    const out: Record<string, unknown> = { ...defaultSettings }
    for (const row of rows ?? []) if (row.id in defaultSettings) out[row.id] = row.value
    return out as Settings
  }, [rows])
  const set = useCallback(<K extends SettingKey>(key: K, value: Settings[K]) => setSetting(key, value), [])
  return { settings, setSetting: set, loaded: rows !== undefined }
}

/** Applies appearance settings (accent colour) to the document. */
export function useApplyAppearance() {
  const { settings } = useSettings()
  useEffect(() => {
    document.documentElement.style.setProperty('--accent', settings.accentColor)
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', settings.accentColor)
  }, [settings.accentColor])
}
