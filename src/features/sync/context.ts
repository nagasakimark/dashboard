import { createContext, useContext } from 'react'
import type { SyncStatus } from './engine'

export interface SyncApi {
  /** Sync is switched on for this device. */
  enabled: boolean
  account: { email: string | null; name: string | null; photo: string | null } | null
  status: SyncStatus
  busy: boolean
  enable: () => Promise<void>
  disable: () => Promise<void>
  syncNow: () => Promise<void>
  removeCloudData: () => Promise<void>
}

const noop = async () => {}
export const SyncContext = createContext<SyncApi>({
  enabled: false,
  account: null,
  status: { state: 'idle', lastSyncedAt: null, error: null, tooLarge: 0 },
  busy: false,
  enable: noop,
  disable: noop,
  syncNow: noop,
  removeCloudData: noop,
})

export const useSync = () => useContext(SyncContext)

/** Device-only switch (never synced itself). */
export const SYNC_ENABLED_KEY = 'sync:enabled'
export const syncWanted = () => {
  try {
    return localStorage.getItem(SYNC_ENABLED_KEY) === '1'
  } catch {
    return false
  }
}
