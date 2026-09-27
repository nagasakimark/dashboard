import { format } from 'date-fns'
import { CloudUpload, LogOut, RefreshCw, Trash2 } from 'lucide-react'
import { Badge, Button, Card, CardHeader, useFeedback } from '@/components/ui'
import { useSync } from '@/features/sync/context'
import { SyncBadge } from '@/features/sync/SyncBadge'

/** Optional sync across devices (Google sign-in + Firestore). */
export function SyncSection() {
  const sync = useSync()
  const { toast, confirm } = useFeedback()
  const act = async (fn: () => Promise<void>, done?: string) => {
    try {
      await fn()
      if (done) toast(done, { tone: 'success' })
    } catch (e) {
      const code = (e as { code?: string }).code
      toast(
        code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request'
          ? 'Sign-in was cancelled.'
          : code === 'auth/operation-not-allowed' || code === 'auth/configuration-not-found'
            ? 'Google sign-in isn’t switched on for this app yet (see docs/firebase/SETUP.md).'
            : code === 'auth/unauthorized-domain'
              ? 'This web address isn’t allowed to sign in yet (see docs/firebase/SETUP.md).'
              : `Couldn’t turn on sync: ${e instanceof Error ? e.message : String(e)}`,
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
        {sync.enabled && sync.account ? (
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
          <Button variant="primary" icon={CloudUpload} disabled={sync.busy} onClick={() => void act(sync.enable)}>
            Sign in with Google and turn on sync
          </Button>
        )}
      </div>
    </Card>
  )
}
