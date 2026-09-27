/*
 * The tiny slice of a realtime database the polls need. Production uses
 * Firebase Realtime Database (loaded only when a poll opens); tests and
 * offline demos use a local backend shared between tabs of this browser.
 */

export type Unsubscribe = () => void

export interface PollDb {
  kind: 'firebase' | 'local'
  get(path: string): Promise<unknown>
  set(path: string, value: unknown): Promise<void>
  update(path: string, value: Record<string, unknown>): Promise<void>
  push(path: string, value: unknown): Promise<string>
  remove(path: string): Promise<void>
  on(path: string, cb: (value: unknown) => void): Unsubscribe
  /** Rooms idle since before `before` (ms), for clean-up. */
  staleRooms(before: number): Promise<string[]>
  /** Stable per-device user id when signed in anonymously, else null. */
  uid: string | null
  /** Server timestamp placeholder for writes. */
  timestamp(): unknown
}

/** Which backend to use: `localStorage.pollBackend = 'local'` switches to the local one. */
export function pollBackend(): 'firebase' | 'local' {
  try {
    return localStorage.getItem('pollBackend') === 'local' ? 'local' : 'firebase'
  } catch {
    return 'firebase'
  }
}

const instances = new Map<string, Promise<PollDb>>()

/**
 * The poll database. Teachers sign in anonymously (so the rules can tie a
 * room to its owner); students don't need an account.
 */
export function getPollDb({ signIn = true }: { signIn?: boolean } = {}): Promise<PollDb> {
  const backend = pollBackend()
  const key = `${backend}:${signIn}`
  let p = instances.get(key)
  if (!p) {
    p = (
      backend === 'local'
        ? import('./localDb').then((m) => m.createLocalDb())
        : import('./firebaseDb').then((m) => m.createFirebaseDb(signIn))
    ).catch((e) => {
      instances.delete(key)
      throw e
    })
    instances.set(key, p)
  }
  return p
}
