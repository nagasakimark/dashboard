import { useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { CloudDownload, Download, ShieldAlert, X } from 'lucide-react'
import { Button, ButtonLink, Card, IconButton, useFeedback } from '@/components/ui'
import { db } from '@/data/db'
import { checkIntegrity, dismissWipeNotice, wipeNoticeAt } from '@/data/integrity'
import { lastExportAt, markExported } from '@/data/storage'
import { buildExport, downloadJson, exportFileName } from '@/data/transfer'
import { useSync } from '@/features/sync/context'

const DAY = 86400_000
const FIRST_SEEN = 'dataFirstSeenAt'
const SNOOZE = 'backupReminderUntil'

const local = {
  get: (k: string) => {
    try {
      return Number(localStorage.getItem(k)) || null
    } catch {
      return null
    }
  },
  set: (k: string, v: number) => {
    try {
      localStorage.setItem(k, String(v))
    } catch {
      // Ignore.
    }
  },
}

/**
 * Home-page notices about the data itself:
 * - the browser cleared it (how to get it back);
 * - it's empty and sync is off (bring it from another device);
 * - there's data but no backup copy anywhere (download a file).
 */
export function DataBanners() {
  const { toast } = useFeedback()
  const sync = useSync()
  const [wiped, setWiped] = useState<number | null>(null)
  // The check runs at start-up; read its verdict once it has finished.
  useEffect(() => {
    let off = false
    void checkIntegrity().then(() => !off && setWiped(wipeNoticeAt()))
    return () => {
      off = true
    }
  }, [])
  const [snoozed, setSnoozed] = useState(false)
  const [now] = useState(Date.now)
  const counts = useLiveQuery(
    async () => ({
      schools: await db.schools.count(),
      periods: await db.periods.count(),
      plans: await db.lessonPlans.count(),
    }),
    [],
  )
  if (!counts) return null
  const empty = counts.schools + counts.periods + counts.plans === 0
  const synced = sync.enabled && !!sync.account

  if (wiped)
    return (
      <Card className="mb-5 flex flex-col gap-3 border-danger/30 bg-danger/5 p-4 sm:flex-row sm:items-center" role="alert">
        <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-danger text-white shadow-sm">
          <ShieldAlert size={22} aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-ink">This browser cleared the app’s stored data</p>
          <p className="text-sm text-ink-soft">
            Nothing was deleted from your cloud copy. Sign in under Settings → Sync and it all comes back; or import your last backup file.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <ButtonLink to="/settings#sync" variant="primary" icon={CloudDownload}>
            Bring it back
          </ButtonLink>
          <IconButton
            icon={X}
            label="Dismiss"
            onClick={() => {
              dismissWipeNotice()
              setWiped(null)
            }}
          />
        </div>
      </Card>
    )

  if (empty && !synced) {
    if (local.get('emptyBannerOff')) return null
    return (
      <Card className="mb-5 flex flex-col gap-3 border-accent/30 bg-accent-soft/50 p-4 sm:flex-row sm:items-center">
        <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-accent text-white shadow-sm">
          <CloudDownload size={22} aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-ink">Already use ALT Dashboard on another device?</p>
          <p className="text-sm text-ink-soft">Sign in with Google under Settings → Sync to bring your schedule, lessons and board here.</p>
        </div>
        <ButtonLink to="/settings#sync" variant="primary">
          Sign in to sync
        </ButtonLink>
      </Card>
    )
  }

  // Data with no copy anywhere: remind about a backup file every couple of weeks.
  if (!empty && !synced && !snoozed) {
    const firstSeen = local.get(FIRST_SEEN) ?? (local.set(FIRST_SEEN, now), now)
    const reference = Math.max(lastExportAt() ?? 0, firstSeen)
    if (now - reference < 14 * DAY || now < (local.get(SNOOZE) ?? 0)) return null
    return (
      <Card className="mb-5 flex flex-col gap-3 border-warning/30 bg-warning/5 p-4 sm:flex-row sm:items-center">
        <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-warning text-white shadow-sm">
          <Download size={22} aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-ink">Your data only exists in this browser</p>
          <p className="text-sm text-ink-soft">
            {lastExportAt() ? 'It’s been a while since your last backup file.' : 'You haven’t downloaded a backup file yet.'} Download one,
            or turn on sync, so a browser clean-up can’t take your lesson plans with it.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button
            variant="primary"
            icon={Download}
            onClick={async () => {
              downloadJson(JSON.stringify(await buildExport(), null, 1), exportFileName())
              markExported()
              setSnoozed(true)
              toast('Backup file downloaded. Keep it somewhere safe.', { tone: 'success' })
            }}
          >
            Download backup
          </Button>
          <ButtonLink to="/settings#sync">Use sync</ButtonLink>
          <IconButton
            icon={X}
            label="Remind me later"
            onClick={() => {
              local.set(SNOOZE, now + 14 * DAY)
              setSnoozed(true)
            }}
          />
        </div>
      </Card>
    )
  }
  return null
}
