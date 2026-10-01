import { db } from './db'
import { newId } from './repo'

/*
 * Notice when the browser has cleared this app's database (storage clean-up,
 * "clear site data", a school policy…). The database holds a random marker, and
 * a copy of it sits in localStorage. If localStorage remembers a marker the
 * database no longer has, the database was wiped while the rest survived.
 *
 * A wipe never writes deletions: sync only sends the deletions you make in the
 * app. This check lets sync re-download everything instead of staying empty.
 */

const MARKER = 'dbInstance'
const LOCAL_KEY = 'dbInstance'
const WIPED_KEY = 'dataWipedAt'

export interface Integrity {
  /** The database was found empty of its marker although this browser had used the app before. */
  wiped: boolean
}

let checked: Promise<Integrity> | null = null

const local = {
  get: (k: string) => {
    try {
      return localStorage.getItem(k)
    } catch {
      return null
    }
  },
  set: (k: string, v: string) => {
    try {
      localStorage.setItem(k, v)
    } catch {
      // Blocked storage: nothing to compare against next time.
    }
  },
  remove: (k: string) => {
    try {
      localStorage.removeItem(k)
    } catch {
      // Ignore.
    }
  },
}

async function run(): Promise<Integrity> {
  try {
    const row = await db.meta.get(MARKER)
    const remembered = local.get(LOCAL_KEY)
    if (row) {
      if (remembered !== String(row.value)) local.set(LOCAL_KEY, String(row.value))
      return { wiped: false }
    }
    const id = newId()
    await db.meta.put({ key: MARKER, value: id })
    local.set(LOCAL_KEY, id)
    const wiped = remembered !== null
    if (wiped) local.set(WIPED_KEY, String(Date.now()))
    return { wiped }
  } catch {
    return { wiped: false }
  }
}

/** Runs once per page load; every caller gets the same answer. */
export const checkIntegrity = (): Promise<Integrity> => (checked ??= run())

/** When a wipe was noticed (until the notice is dismissed), else null. */
export const wipeNoticeAt = (): number | null => Number(local.get(WIPED_KEY)) || null
export const dismissWipeNotice = () => local.remove(WIPED_KEY)

/** For tests: forget the cached check. */
export const resetIntegrityCheck = () => {
  checked = null
}
