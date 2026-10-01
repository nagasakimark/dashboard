import { useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { formatDistanceToNow } from 'date-fns'
import { Archive, Database, DatabaseZap, Download, MoreVertical, RotateCcw, Trash2, Upload } from 'lucide-react'
import { Badge, Button, Card, CardHeader, IconButton, Menu, useFeedback } from '@/components/ui'
import { db } from '@/data/db'
import { SYNCED_TABLES } from '@/data/schema'
import { markExported } from '@/data/storage'
import {
  buildExport,
  createBackup,
  downloadJson,
  exportFileName,
  isAutoBackup,
  replaceAllData,
  restoreBackup,
  type ExportFile,
} from '@/data/transfer'
import { useSync } from '@/features/sync/context'
import { readImportFile, type ImportPlan } from '@/data/importFile'
import { CountsList, ImportDialog } from './ImportDialog'
import { ProtectionCard } from './ProtectionCard'
import { useLegacyImport } from './useLegacyImport'

export function DataSection() {
  const { toast, confirm } = useFeedback()
  const fileInput = useRef<HTMLInputElement>(null)
  const [plan, setPlan] = useState<ImportPlan | null>(null)
  const [busy, setBusy] = useState(false)
  const legacy = useLegacyImport()
  const sync = useSync()
  const syncNote = sync.enabled ? ' Sync is on, so this also replaces your cloud copy and your other devices.' : ''
  const [openBackup, setOpenBackup] = useState<string | null>(null)
  const backups = useLiveQuery(() => db.backups.orderBy('createdAt').reverse().toArray(), [])

  const undoable = (message: string, backupId: string) =>
    toast(message, {
      tone: 'success',
      action: {
        label: 'Undo',
        onClick: async () => {
          await restoreBackup(backupId)
          toast('Restored your previous data.', { tone: 'success' })
        },
      },
    })

  const onExport = async () => {
    const file = await buildExport()
    downloadJson(JSON.stringify(file, null, 1), exportFileName())
    markExported()
    toast('Export downloaded.', { tone: 'success' })
  }

  const onPickFile = async (f: File | undefined) => {
    if (!f) return
    setBusy(true)
    try {
      setPlan(await readImportFile(await f.text(), f.name))
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Could not read that file.', { tone: 'error' })
    } finally {
      setBusy(false)
    }
  }

  const onReset = async () => {
    const ok = await confirm({
      title: 'Erase all data on this device?',
      message: `Everything is removed from this device. A backup is kept here so you can undo this.${syncNote}`,
      confirmLabel: sync.enabled ? 'Erase everything, everywhere' : 'Erase everything',
      danger: true,
    })
    if (!ok) return
    const empty = {
      app: 'alt-dashboard',
      schemaVersion: 1,
      exportedAt: '',
      data: Object.fromEntries(SYNCED_TABLES.map((t) => [t, []])),
    } as unknown as ExportFile
    const backup = await replaceAllData(empty, 'Before erasing all data')
    undoable('All data erased.', backup.id)
  }

  return (
    <>
      <ProtectionCard />
      <Card>
        <CardHeader
          icon={Database}
          title="Your data"
          description="Everything is stored on this device. Export a file to back it up or move it to another device."
        />
        <div className="flex flex-wrap gap-2 px-5 pb-5">
          <Button variant="primary" icon={Download} onClick={onExport}>
            Export everything
          </Button>
          <Button icon={Upload} onClick={() => fileInput.current?.click()} disabled={busy}>
            Import a file…
          </Button>
          <input
            ref={fileInput}
            type="file"
            accept=".json,application/json"
            className="hidden"
            onChange={(e) => {
              void onPickFile(e.target.files?.[0])
              e.target.value = ''
            }}
          />
          {legacy.available && (
            <Button icon={DatabaseZap} onClick={legacy.review} disabled={legacy.loading}>
              Import from old dashboard
            </Button>
          )}
          <Button variant="ghost" icon={Trash2} className="text-danger hover:text-danger sm:ml-auto" onClick={onReset}>
            Erase all data
          </Button>
        </div>
        <p className="border-t border-line px-5 py-3 text-xs text-ink-faint">
          Import accepts exports from this app, the ALT Planner (original and dashboard versions) and old dashboard workspace files.
        </p>
      </Card>

      <Card>
        <CardHeader
          icon={Archive}
          title="Backups on this device"
          description="Snapshots of all your data. One is taken automatically each day you use the app (the last 7 are kept), and another before every import, restore or erase (the last 5)."
          actions={
            <Button
              size="sm"
              onClick={async () => {
                await createBackup('Manual backup')
                toast('Backup created.', { tone: 'success' })
              }}
            >
              Back up now
            </Button>
          }
        />
        <p className="border-t border-line bg-canvas/60 px-5 py-2.5 text-xs text-ink-soft">
          <strong>To go back to one:</strong> press <strong>Restore</strong> on its row. Your current data is backed up first, so you can
          undo. These backups live in this browser, so they don’t help if the browser clears everything: for that, use sync or download a
          backup file (above).
        </p>
        <ul className="divide-y divide-line border-t border-line">
          {backups?.length === 0 && (
            <li className="px-5 py-4 text-sm text-ink-faint">No backups yet. The first one is taken tomorrow, or press Back up now.</li>
          )}
          {backups?.map((b) => {
            const total = Object.entries(b.counts)
              .filter(([k]) => k !== 'settings')
              .reduce((n, [, v]) => n + v, 0)
            return (
              <li key={b.id} className="px-5 py-3">
                <div className="flex items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-2 truncate text-sm font-medium text-ink">
                      {b.reason}
                      {isAutoBackup(b) && <Badge>Automatic</Badge>}
                    </p>
                    <button
                      type="button"
                      className="text-left text-xs text-ink-faint hover:text-ink-soft"
                      onClick={() => setOpenBackup(openBackup === b.id ? null : b.id)}
                      aria-expanded={openBackup === b.id}
                    >
                      {new Date(b.createdAt).toLocaleString()} · {formatDistanceToNow(b.createdAt, { addSuffix: true })} ·{' '}
                      {total.toLocaleString()} records · {openBackup === b.id ? 'hide details' : 'see what’s inside'}
                    </button>
                  </div>
                  <Button
                    size="sm"
                    icon={RotateCcw}
                    onClick={async () => {
                      const ok = await confirm({
                        title: 'Restore this backup?',
                        message: `Your current data is replaced by this backup (${new Date(b.createdAt).toLocaleString()}). Your current data is backed up first, so you can undo.${syncNote}`,
                        confirmLabel: 'Restore',
                      })
                      if (!ok) return
                      await restoreBackup(b.id)
                      toast('Backup restored.', { tone: 'success' })
                    }}
                  >
                    Restore
                  </Button>
                  <Menu
                    trigger={(p) => <IconButton {...p} icon={MoreVertical} label="More backup options" size="sm" />}
                    items={[
                      {
                        label: 'Download as file',
                        icon: Download,
                        onSelect: () =>
                          downloadJson(b.json, `alt-dashboard-backup-${new Date(b.createdAt).toISOString().slice(0, 10)}.json`),
                      },
                      'divider',
                      { label: 'Delete backup', icon: Trash2, danger: true, onSelect: () => db.backups.delete(b.id) },
                    ]}
                  />
                </div>
                {openBackup === b.id && (
                  <div className="mt-3">
                    <CountsList counts={b.counts} />
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      </Card>

      <ImportDialog plan={plan} onClose={() => setPlan(null)} />
      <ImportDialog plan={legacy.plan} onClose={legacy.close} title="Import from the old dashboard" confirmLabel="Import my data" />
    </>
  )
}
