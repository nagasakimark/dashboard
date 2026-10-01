/*
 * Ask the browser to keep this app's data. Without this, a browser that runs
 * low on disk space may clear the site's storage on its own ("best-effort"
 * storage). Chrome and Edge grant it automatically to installed apps and
 * well-used sites; Safari and Firefox decide differently (Firefox asks).
 */

export interface StorageStatus {
  supported: boolean
  /** The browser promised not to clear the data on its own. */
  persisted: boolean
  usage: number | null
  quota: number | null
}

export async function storageStatus(): Promise<StorageStatus> {
  const s = typeof navigator !== 'undefined' ? navigator.storage : undefined
  if (!s?.persisted) return { supported: false, persisted: false, usage: null, quota: null }
  const [persisted, estimate] = await Promise.all([s.persisted().catch(() => false), s.estimate?.().catch(() => null)])
  return { supported: true, persisted, usage: estimate?.usage ?? null, quota: estimate?.quota ?? null }
}

/** Ask for protected storage. Returns whether it is now granted. */
export async function requestPersistence(): Promise<boolean> {
  const s = typeof navigator !== 'undefined' ? navigator.storage : undefined
  if (!s?.persist) return false
  try {
    return (await s.persisted?.()) || (await s.persist())
  } catch {
    return false
  }
}

/** At start-up, quietly ask where the browser won't show a prompt for it (Firefox does). */
export function requestPersistenceQuietly(): void {
  if (typeof navigator === 'undefined' || /firefox/i.test(navigator.userAgent)) return
  void requestPersistence()
}

export const formatBytes = (n: number | null) =>
  n === null
    ? ''
    : n < 1024 * 1024
      ? `${Math.max(1, Math.round(n / 1024))} KB`
      : n < 1024 ** 3
        ? `${(n / 1024 / 1024).toFixed(1)} MB`
        : `${(n / 1024 ** 3).toFixed(1)} GB`

const EXPORT_KEY = 'lastExportAt'

/** Remember when a backup file was last downloaded (this device only). */
export function markExported(now = Date.now()) {
  try {
    localStorage.setItem(EXPORT_KEY, String(now))
  } catch {
    // Ignore.
  }
}

export function lastExportAt(): number | null {
  try {
    return Number(localStorage.getItem(EXPORT_KEY)) || null
  } catch {
    return null
  }
}
