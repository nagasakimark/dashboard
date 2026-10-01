import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { formatDistanceToNow } from 'date-fns'
import { Check, CloudUpload, Download, HardDrive, ShieldCheck, TriangleAlert } from 'lucide-react'
import { Button, Card, CardHeader, useFeedback } from '@/components/ui'
import { formatBytes, lastExportAt, markExported, requestPersistence, storageStatus, type StorageStatus } from '@/data/storage'
import { buildExport, downloadJson, exportFileName } from '@/data/transfer'
import { useSync } from '@/features/sync/context'

function Row({
  ok,
  icon: Icon,
  title,
  children,
  action,
}: {
  ok: boolean
  icon: typeof Check
  title: string
  children: React.ReactNode
  action?: React.ReactNode
}) {
  return (
    <li className="flex items-start gap-3 px-5 py-3.5">
      <span
        className={`mt-0.5 grid size-8 shrink-0 place-items-center rounded-full ${ok ? 'bg-success/12 text-success' : 'bg-warning/15 text-warning'}`}
        aria-hidden
      >
        {ok ? <Check size={17} /> : <TriangleAlert size={16} />}
      </span>
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-1.5 text-sm font-semibold text-ink">
          <Icon size={14} className="text-ink-faint" aria-hidden /> {title}
        </p>
        <p className="mt-0.5 text-sm text-ink-soft">{children}</p>
      </div>
      {action}
    </li>
  )
}

/** Plain-language status of how well the data is protected, with the fix for each gap. */
export function ProtectionCard() {
  const { toast } = useFeedback()
  const sync = useSync()
  const [storage, setStorage] = useState<StorageStatus | null>(null)
  const [exported, setExported] = useState(lastExportAt)

  useEffect(() => {
    let off = false
    void storageStatus().then((s) => !off && setStorage(s))
    return () => {
      off = true
    }
  }, [])

  const protect = async () => {
    const granted = await requestPersistence()
    setStorage(await storageStatus())
    toast(
      granted
        ? 'Done. Your browser will keep this app’s data.'
        : 'Your browser didn’t agree. Installing the app (above) usually helps, and turning on sync keeps a copy off this device.',
      { tone: granted ? 'success' : 'info', duration: granted ? 5000 : 10000 },
    )
  }

  const download = async () => {
    downloadJson(JSON.stringify(await buildExport(), null, 1), exportFileName())
    markExported()
    setExported(Date.now())
    toast('Backup file downloaded. Keep it somewhere safe, such as Google Drive.', { tone: 'success' })
  }

  const synced = sync.enabled && !!sync.account
  const [now] = useState(Date.now)
  const recentFile = exported !== null && now - exported < 30 * 86400_000

  return (
    <Card>
      <CardHeader
        icon={ShieldCheck}
        title="Keeping your data safe"
        description="Your data lives in this browser. Three things protect it; each shows whether it’s in place."
      />
      <ul className="divide-y divide-line border-t border-line">
        <Row
          ok={!!storage?.persisted}
          icon={HardDrive}
          title="Protected from browser clean-up"
          action={
            storage?.supported && !storage.persisted ? (
              <Button size="sm" onClick={() => void protect()}>
                Protect my data
              </Button>
            ) : undefined
          }
        >
          {!storage
            ? 'Checking…'
            : !storage.supported
              ? 'This browser doesn’t say. Sync or a backup file are your safety net.'
              : storage.persisted
                ? `Yes: the browser won’t clear this app’s data on its own.${storage.usage !== null ? ` Using ${formatBytes(storage.usage)}.` : ''}`
                : 'Not yet: a browser that runs short of disk space may clear this app’s data without asking.'}
        </Row>
        <Row
          ok={synced}
          icon={CloudUpload}
          title="A copy in the cloud (sync)"
          action={
            !synced && (
              <Link to="/settings#sync" className="text-sm font-semibold text-accent underline underline-offset-2">
                Turn on
              </Link>
            )
          }
        >
          {synced
            ? 'Yes: changes are copied to your Google account. If this browser loses its data, signing in brings everything back.'
            : 'Off: if this browser loses its data, there’s no other copy except a downloaded file.'}
        </Row>
        <Row
          ok={recentFile}
          icon={Download}
          title="A backup file on your computer"
          action={
            <Button size="sm" variant={recentFile ? 'secondary' : 'primary'} onClick={() => void download()}>
              Download
            </Button>
          }
        >
          {exported ? `Last downloaded ${formatDistanceToNow(exported, { addSuffix: true })}.` : 'Never downloaded.'}{' '}
          {recentFile ? '' : 'Download one now and again every month or so.'}
        </Row>
      </ul>
      <p className="border-t border-line px-5 py-3 text-xs text-ink-faint">
        If the browser ever clears the app’s data, nothing is deleted from your cloud copy: sign in again under Sync and it all comes back.
        Without sync, import your last backup file.
      </p>
    </Card>
  )
}
