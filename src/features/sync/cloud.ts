import {
  getAuth,
  getRedirectResult,
  GoogleAuthProvider,
  linkWithCredential,
  linkWithPopup,
  signInWithCredential,
  signInWithPopup,
  signInWithRedirect,
  signOut,
  type User,
} from 'firebase/auth'
import {
  collection,
  doc,
  getDocs,
  getFirestore,
  onSnapshot,
  query,
  serverTimestamp,
  Timestamp,
  where,
  writeBatch,
  type Firestore,
} from 'firebase/firestore'
import { db } from '@/data/db'
import { SYNCED_TABLES } from '@/data/schema'
import { firebaseApp } from '@/lib/firebaseApp'
import { SyncEngine, type KeyValue, type Remote, type SyncStatus } from './engine'
import { googleAccessToken } from './gis'

/*
 * Firebase side of sync, loaded only when sync is on. Data lives at
 * users/{uid}/{table}/{recordId}; the security rules let each signed-in user
 * read and write only their own tree.
 */

export interface Account {
  uid: string
  email: string | null
  name: string | null
  photo: string | null
}

const toAccount = (u: User): Account => ({ uid: u.uid, email: u.email, name: u.displayName, photo: u.photoURL })

const auth = () => getAuth(firebaseApp())

/** The signed-in Google account, if any (anonymous poll sessions don't count). */
export async function currentAccount(): Promise<Account | null> {
  const a = auth()
  await getRedirectResult(a).catch(() => null)
  await a.authStateReady()
  const u = a.currentUser
  return u && !u.isAnonymous ? toAccount(u) : null
}

export type SignInMethod = 'google' | 'firebase'

/**
 * Sign in with Google. `google` (the default) uses Google's own window on
 * accounts.google.com; `firebase` uses Firebase's window on firebaseapp.com.
 * An anonymous poll session is upgraded in place, so rooms made on this
 * device stay yours.
 */
export async function signInWithGoogle(method: SignInMethod = 'google'): Promise<Account | null> {
  return method === 'google' ? signInWithGis() : signInWithFirebaseWindow()
}

async function signInWithGis(): Promise<Account> {
  const token = await googleAccessToken()
  const a = auth()
  await a.authStateReady()
  const cred = GoogleAuthProvider.credential(null, token)
  const u = a.currentUser
  if (u?.isAnonymous) {
    try {
      return toAccount((await linkWithCredential(u, cred)).user)
    } catch (e) {
      // That Google account already has data here: sign in to it instead.
      if ((e as { code?: string }).code !== 'auth/credential-already-in-use') throw e
      return toAccount((await signInWithCredential(a, GoogleAuthProvider.credentialFromError(e as never) ?? cred)).user)
    }
  }
  return toAccount((await signInWithCredential(a, cred)).user)
}

/** Firebase's own sign-in window, falling back to a full-page redirect where pop-ups are blocked (some installed apps). */
async function signInWithFirebaseWindow(): Promise<Account | null> {
  const a = auth()
  await a.authStateReady()
  const provider = new GoogleAuthProvider()
  provider.setCustomParameters({ prompt: 'select_account' })
  try {
    const u = a.currentUser
    if (u?.isAnonymous) {
      try {
        return toAccount((await linkWithPopup(u, provider)).user)
      } catch (e) {
        // That Google account already has data here: sign in to it instead.
        const cred = GoogleAuthProvider.credentialFromError(e as never)
        if (cred) return toAccount((await signInWithCredential(a, cred)).user)
        throw e
      }
    }
    return toAccount((await signInWithPopup(a, provider)).user)
  } catch (e) {
    const code = (e as { code?: string }).code ?? ''
    if (code === 'auth/popup-blocked' || code === 'auth/operation-not-supported-in-this-environment') {
      await signInWithRedirect(a, provider)
      return null
    }
    throw e
  }
}

export const signOutGoogle = () => signOut(auth())

function firestoreRemote(fs: Firestore, uid: string): Remote {
  const col = (table: string) => collection(fs, 'users', uid, table)
  return {
    async write(table, docs) {
      for (let i = 0; i < docs.length; i += 400) {
        const batch = writeBatch(fs)
        for (const d of docs.slice(i, i + 400))
          batch.set(doc(col(table), d.id), { data: d.data, updatedAt: d.updatedAt, deleted: d.deleted, serverAt: serverTimestamp() })
        await batch.commit()
      }
    },
    listen(table, since, onDocs, onError) {
      const q = query(col(table), where('serverAt', '>', Timestamp.fromMillis(since)))
      return onSnapshot(
        q,
        (snap) => {
          const docs = snap
            .docChanges()
            .filter((c) => c.type !== 'removed' && !c.doc.metadata.hasPendingWrites)
            .map((c) => {
              const d = c.doc.data() as { data: string | null; updatedAt: number; deleted: boolean; serverAt: Timestamp | null }
              return { id: c.doc.id, data: d.data, updatedAt: d.updatedAt, deleted: d.deleted, serverAt: d.serverAt?.toMillis() ?? since }
            })
          if (docs.length) onDocs(docs)
        },
        onError,
      )
    },
    async ids(table) {
      return (await getDocs(col(table))).docs.map((d) => d.id)
    },
    async clear() {
      for (const table of SYNCED_TABLES) {
        const snap = await getDocs(col(table))
        for (let i = 0; i < snap.docs.length; i += 400) {
          const batch = writeBatch(fs)
          snap.docs.slice(i, i + 400).forEach((d) => batch.delete(d.ref))
          await batch.commit()
        }
      }
    },
  }
}

const storage: KeyValue = {
  get: (k) => localStorage.getItem(k),
  set: (k, v) => localStorage.setItem(k, v),
  remove: (k) => localStorage.removeItem(k),
}

export interface CloudSync {
  engine: SyncEngine
  remote: Remote
  stop: () => void
}

/** Start syncing this device's data with the signed-in account's cloud copy. */
export function startCloudSync(account: Account, onStatus: (s: SyncStatus) => void): CloudSync {
  const remote = firestoreRemote(getFirestore(firebaseApp()), account.uid)
  // Cursors are per account, so switching accounts starts cleanly.
  const engine = new SyncEngine(db, remote, storage, onStatus, `sync:${account.uid}:`)
  engine.start()
  return { engine, remote, stop: () => engine.stop() }
}

export const resetSyncState = (uid: string) => SyncEngine.reset(storage, `sync:${uid}:`)
