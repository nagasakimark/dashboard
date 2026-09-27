import type { LegacyDashboardSnapshot } from './dashboard'
import type { Json } from './util'

/**
 * Reads the legacy databases that the old dashboard and planner left in this
 * browser. All nagasakimark.github.io pages share one origin, so the new app
 * can see them. Strictly read-only: databases that don't exist are never
 * created, and nothing is written.
 */

const PLANNER_DB = 'alt-planner-db'
const DASHBOARD_DB = 'livepoll'

async function existingDatabases(): Promise<Set<string> | null> {
  if (typeof indexedDB === 'undefined' || typeof indexedDB.databases !== 'function') return null
  try {
    return new Set((await indexedDB.databases()).map((d) => d.name ?? ''))
  } catch {
    return null
  }
}

function openExisting(name: string): Promise<IDBDatabase | null> {
  return new Promise((resolve) => {
    const req = indexedDB.open(name)
    // If this fires the database didn't exist: abort so it isn't created.
    req.onupgradeneeded = () => {
      req.transaction?.abort()
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => resolve(null)
    req.onblocked = () => resolve(null)
  })
}

function readStore(db: IDBDatabase, store: string, key?: string): Promise<unknown> {
  return new Promise((resolve) => {
    if (!db.objectStoreNames.contains(store)) return resolve(undefined)
    const tx = db.transaction(store, 'readonly')
    const req = key === undefined ? tx.objectStore(store).getAll() : tx.objectStore(store).get(key)
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => resolve(undefined)
  })
}

export interface LegacyBrowserData {
  /** Shaped like a planner export file (so the same converter applies). */
  planner: Json | null
  dashboard: LegacyDashboardSnapshot | null
}

export async function readLegacyBrowserData(): Promise<LegacyBrowserData> {
  const names = await existingDatabases()
  if (!names) return { planner: null, dashboard: null }

  let planner: Json | null = null
  if (names.has(PLANNER_DB)) {
    const db = await openExisting(PLANNER_DB)
    if (db) {
      const unwrap = async (store: string) => ((await readStore(db, store, 'default')) as { data?: unknown } | undefined)?.data
      planner = {
        schools: await readStore(db, 'schools'),
        assignments: (await unwrap('assignments')) ?? {},
        schedule: (await unwrap('schedule')) ?? {},
        textbooks: await readStore(db, 'textbooks'),
        lessonPlans: await readStore(db, 'lessonPlans'),
        settings: (await unwrap('settings')) ?? {},
        sections: await readStore(db, 'sections'),
        todos: await readStore(db, 'todos'),
        curriculums: await readStore(db, 'curriculums'),
      }
      db.close()
    }
  }

  let dashboard: LegacyDashboardSnapshot | null = null
  if (names.has(DASHBOARD_DB)) {
    const db = await openExisting(DASHBOARD_DB)
    if (db) {
      dashboard = {
        workspaces: (await readStore(db, 'workspaces')) as unknown[],
        settings: (await readStore(db, 'settings')) as unknown[],
        templates: (await readStore(db, 'templates')) as unknown[],
        textbooks: (await readStore(db, 'textbooks')) as unknown[],
      }
      db.close()
    }
  }
  try {
    const raw = localStorage.getItem('customBookmarks')
    const bookmarks = raw ? JSON.parse(raw) : null
    if (Array.isArray(bookmarks) && bookmarks.length) dashboard = { ...(dashboard ?? {}), bookmarks }
  } catch {
    /* ignore unreadable bookmarks */
  }

  return { planner, dashboard }
}

/** True when the snapshot contains anything worth importing. */
export function hasLegacyContent({ planner, dashboard }: LegacyBrowserData): boolean {
  const n = (v: unknown) => (Array.isArray(v) ? v.length : v && typeof v === 'object' ? Object.keys(v).length : 0)
  const plannerCount = planner ? n(planner.schools) + n(planner.schedule) + n(planner.lessonPlans) + n(planner.textbooks) : 0
  const widgetCount = (dashboard?.workspaces ?? []).reduce<number>(
    (sum, w) =>
      sum +
      (w && typeof w === 'object' && Array.isArray((w as { widgets?: unknown[] }).widgets)
        ? (w as { widgets: unknown[] }).widgets.length
        : 0),
    0,
  )
  const dashboardCount = dashboard ? widgetCount + n(dashboard.templates) + n(dashboard.textbooks) + n(dashboard.bookmarks) : 0
  return plannerCount + dashboardCount > 0
}
