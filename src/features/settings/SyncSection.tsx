import { useEffect } from 'react'
import { format } from 'date-fns'
import { CloudUpload, LogOut, RefreshCw, Trash2 } from 'lucide-react'
import { Badge, Button, Card, CardHeader, useFeedback } from '@/components/ui'
import { useSync } from '@/features/sync/context'
import { SyncBadge } from '@/features/sync/SyncBadge'
import { loadGis } from '@/features/sync/gis'

/** Optional sync across devices (Google sign-in + Firestore). */
export function SyncSection() {
  const sync = useSync()
  const { toast, confirm } = useFeedback()
  const signedIn = sync.enabled && !!sync.account
  // Load Google's sign-in script ahead of the click, so its window isn't treated as an unrequested pop-up.
  useEffect(() => {
    if (!signedIn) void loadGis().catch(() => undefined)
  }, [signedIn])
  const act = async (fn: () => Promise<void>, done?: string) => {
    try {
      await fn()
      if (done) toast(done, { tone: 'success' })
    } catch (e) {
      const code = (e as { code?: string }).code ?? ''
      const message = e instanceof Error ? e.message : String(e)
      if (code.startsWith('auth/requests-from-referer') || /referer .* blocked/i.test(message))
        return toast(
          'Google blocked the sign-in window: the project’s API key needs studentpoll-a9e39.firebaseapp.com added to its allowed websites (docs/firebase/SETUP.md, “Let the sign-in window use the API key”).',
          { tone: 'error', duration: 15000 },
        )
      if (code === 'gis/popup_closed' || code === 'gis/access_denied')
        return toast(
          'Sign-in didn’t finish. If Google showed an error such as “origin_mismatch”, see docs/firebase/SETUP.md (“Google’s sign-in window”), or use “Try Firebase’s sign-in window” below.',
          { tone: 'error', duration: 12000 },
        )
      if (code === 'gis/script')
        return toast('Couldn’t reach accounts.google.com. Check the connection, or try Firebase’s sign-in window below.', { tone: 'error' })
      toast(
        code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request'
          ? 'Sign-in was cancelled.'
          : code === 'gis/popup_failed_to_open' || code === 'auth/popup-blocked'
            ? 'The browser blocked the sign-in window. Allow pop-ups for this site and try again.'
            : code === 'auth/operation-not-allowed' || code === 'auth/configuration-not-found'
              ? 'Google sign-in isn’t switched on for this app yet (see docs/firebase/SETUP.md).'
              : code === 'auth/unauthorized-domain'
                ? 'This web address isn’t allowed to sign in yet (see docs/firebase/SETUP.md).'
                : `Couldn’t turn on sync: ${message}`,
        { tone: 'error' },
      )
    }
  }

  return (
    <Card id="sync" className="scroll-mt-24">
      <CardHeader
        icon={CloudUpload}
        title="Sync between devices"
        description={
          sync.enabled && sync.account
            ? `Signed in as ${sync.account.email ?? sync.account.name}. Everything syncs automatically, class lists included.`
            : 'Sign in with Google to keep your planner, board, games and settings the same on every device. Off by default; the app works fully without it.'
        }
      />
      <div className="space-y-3 px-5 pb-5">
        {signedIn ? (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <SyncBadge className="-ml-3" />
              {sync.status.lastSyncedAt && (
                <span className="text-xs text-ink-faint">Last synced {format(sync.status.lastSyncedAt, 'd MMM, H:mm')}</span>
              )}
              {sync.status.tooLarge > 0 && <Badge tone="warning">{sync.status.tooLarge} items too large to sync</Badge>}
            </div>
            {sync.status.error && <p className="text-sm text-danger">{sync.status.error}</p>}
            <div className="flex flex-wrap gap-2">
              <Button size="sm" icon={RefreshCw} disabled={sync.busy} onClick={() => void act(sync.syncNow, 'Synced.')}>
                Sync now
              </Button>
              <Button
                size="sm"
                variant="ghost"
                icon={LogOut}
                disabled={sync.busy}
                onClick={() => void act(sync.disable, 'Sync is off. Your data stays on this device.')}
              >
                Turn off and sign out
              </Button>
              <Button
                size="sm"
                variant="ghost"
                icon={Trash2}
                className="text-danger"
                disabled={sync.busy}
                onClick={async () => {
                  const ok = await confirm({
                    title: 'Remove your cloud data?',
                    message:
                      'This deletes the synced copy in the cloud and turns sync off. Data on this device (and on your other devices) stays.',
                    confirmLabel: 'Remove cloud data',
                    danger: true,
                  })
                  if (ok) await act(sync.removeCloudData, 'Cloud data removed and sync turned off.')
                }}
              >
                Sign out and remove cloud data
              </Button>
            </div>
          </>
        ) : (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <Button variant="primary" icon={CloudUpload} disabled={sync.busy} onClick={() => void act(() => sync.enable('google'))}>
              Sign in with Google and turn on sync
            </Button>
            <button
              type="button"
              disabled={sync.busy}
              onClick={() => void act(() => sync.enable('firebase'))}
              className="text-sm font-semibold text-ink-soft underline underline-offset-2 hover:text-accent disabled:opacity-50"
            >
              Try Firebase’s sign-in window
            </button>
          </div>
        )}
      </div>
    </Card>
  )
}
