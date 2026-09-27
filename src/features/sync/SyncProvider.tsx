import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { DATA_REPLACED, dataEvents } from '@/data/events'
import type { SyncStatus } from './engine'
import { SYNC_ENABLED_KEY, SyncContext, syncWanted, type SyncApi } from './context'

type Cloud = typeof import('./cloud')
const loadCloud = () => import('./cloud')

/** Runs background sync while it's switched on (Firebase loads only then). */
export function SyncProvider({ children }: { children: ReactNode }) {
  const [enabled, setEnabled] = useState(syncWanted)
  const [account, setAccount] = useState<SyncApi['account']>(null)
  const [status, setStatus] = useState<SyncStatus>({ state: 'idle', lastSyncedAt: null, error: null, tooLarge: 0 })
  const [busy, setBusy] = useState(false)
  const session = useRef<{ cloud: Cloud; sync: ReturnType<Cloud['startCloudSync']>; uid: string } | null>(null)

  const start = useCallback(async () => {
    try {
      const cloud = await loadCloud()
      const acc = await cloud.currentAccount()
      if (!acc) {
        setAccount(null)
        setStatus((s) => ({ ...s, state: 'idle' }))
        return
      }
      setAccount(acc)
      session.current?.sync.stop()
      session.current = { cloud, sync: cloud.startCloudSync(acc, setStatus), uid: acc.uid }
    } catch (e) {
      setStatus((s) => ({ ...s, state: 'error', error: e instanceof Error ? e.message : String(e) }))
    }
  }, [])

  useEffect(() => {
    if (!enabled) return
    // start() only sets state after awaiting Firebase, never synchronously.
    // eslint-disable-next-line react/set-state-in-effect
    void start()
    return () => {
      session.current?.sync.stop()
      session.current = null
    }
  }, [enabled, start])

  // An import or restore replaced everything here: make the cloud match.
  useEffect(() => {
    const onReplaced = () => void session.current?.sync.engine.replaceCloud().catch(() => {})
    const onOnline = () => void session.current?.sync.engine.push().catch(() => {})
    const onOffline = () => session.current && setStatus((s) => ({ ...s, state: 'offline' }))
    dataEvents.addEventListener(DATA_REPLACED, onReplaced)
    window.addEventListener('online', onOnline)
    window.addEventListener('offline', onOffline)
    return () => {
      dataEvents.removeEventListener(DATA_REPLACED, onReplaced)
      window.removeEventListener('online', onOnline)
      window.removeEventListener('offline', onOffline)
    }
  }, [])

  const run = useCallback(async (fn: () => Promise<void>) => {
    setBusy(true)
    try {
      await fn()
    } finally {
      setBusy(false)
    }
  }, [])

  const api = useMemo<SyncApi>(
    () => ({
      enabled,
      account,
      status,
      busy,
      enable: () =>
        run(async () => {
          const cloud = await loadCloud()
          const acc = await cloud.signInWithGoogle()
          localStorage.setItem(SYNC_ENABLED_KEY, '1')
          if (!acc) return // redirecting to Google
          if (enabled) await start()
          else setEnabled(true)
        }),
      disable: () =>
        run(async () => {
          session.current?.sync.stop()
          const s = session.current
          session.current = null
          localStorage.removeItem(SYNC_ENABLED_KEY)
          if (s) s.cloud.resetSyncState(s.uid)
          await (s?.cloud ?? (await loadCloud())).signOutGoogle()
          setAccount(null)
          setEnabled(false)
          setStatus({ state: 'idle', lastSyncedAt: null, error: null, tooLarge: 0 })
        }),
      syncNow: () =>
        run(async () => {
          await session.current?.sync.engine.push()
        }),
      removeCloudData: () =>
        run(async () => {
          const s = session.current
          if (!s) return
          s.sync.stop()
          await s.sync.remote.clear()
          session.current = { ...s }
          s.cloud.resetSyncState(s.uid)
          localStorage.removeItem(SYNC_ENABLED_KEY)
          await s.cloud.signOutGoogle()
          session.current = null
          setAccount(null)
          setEnabled(false)
          setStatus({ state: 'idle', lastSyncedAt: null, error: null, tooLarge: 0 })
        }),
    }),
    [enabled, account, status, busy, run, start],
  )

  return <SyncContext.Provider value={api}>{children}</SyncContext.Provider>
}
