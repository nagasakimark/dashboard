import { getAuth, signInAnonymously } from 'firebase/auth'
import {
  endAt,
  get,
  getDatabase,
  limitToFirst,
  onValue,
  orderByChild,
  push,
  query,
  ref,
  remove,
  serverTimestamp,
  set,
  update,
} from 'firebase/database'
import { firebaseApp } from '@/lib/firebaseApp'
import type { PollDb } from './db'

export async function createFirebaseDb(signIn = true): Promise<PollDb> {
  const app = firebaseApp()
  const database = getDatabase(app)
  // Anonymous sign-in lets the security rules tie a room to the teacher who
  // made it. If it isn't enabled in the console yet, polls still work the old
  // (open) way.
  let uid: string | null = null
  if (signIn)
    try {
      const auth = getAuth(app)
      // Reuse any saved session (anonymous, or Google once sync is on).
      await auth.authStateReady()
      uid = auth.currentUser?.uid ?? (await signInAnonymously(auth)).user.uid
    } catch {
      uid = null
    }
  const r = (path: string) => ref(database, path)
  return {
    kind: 'firebase',
    uid,
    get: async (path) => (await get(r(path))).val(),
    set: (path, value) => set(r(path), value),
    update: (path, value) => update(r(path), value),
    push: async (path, value) => (await push(r(path), value)).key!,
    remove: (path) => remove(r(path)),
    on: (path, cb) => onValue(r(path), (snap) => cb(snap.val())),
    staleRooms: async (before) => {
      const snap = await get(query(r('rooms'), orderByChild('meta/lastSeenAt'), endAt(before), limitToFirst(20)))
      return Object.keys((snap.val() as Record<string, unknown> | null) ?? {})
    },
    timestamp: () => serverTimestamp(),
  }
}
