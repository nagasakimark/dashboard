import { useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { formatDistanceToNow } from 'date-fns'
import { Archive, Database, DatabaseZap, Download, RotateCcw, Trash2, Upload } from 'lucide-react'
import { Button, Card, CardHeader, IconButton, Menu, useFeedback } from '@/components/ui'
import { db } from '@/data/db'
import { SYNCED_TABLES } from '@/data/schema'
import { buildExport, createBackup, downloadJson, exportFileName, replaceAllData, restoreBackup, type ExportFile } from '@/data/transfer'
import { readImportFile, type ImportPlan } from '@/data/importFile'
import { ImportDialog } from './ImportDialog'
import { useLegacyImport } from './useLegacyImport'

export function DataSection() {
  const { toast, confirm } = useFeedback()
  const fileInput = useRef<HTMLInputElement>(null)
  const [plan, setPlan] = useState<ImportPlan | null>(null)
  const [busy, setBusy] = useState(false)
  const legacy = useLegacyImport()
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
      message: 'Everything is removed from this device. A backup is kept here so you can undo this.',
      confirmLabel: 'Erase everything',
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
          description="Taken automatically before every import, restore or erase. The five newest are kept."
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
        <ul className="divide-y divide-line border-t border-line">
          {backups?.length === 0 && <li className="px-5 py-4 text-sm text-ink-faint">No backups yet.</li>}
          {backups?.map((b) => {
            const total = Object.entries(b.counts)
              .filter(([k]) => k !== 'settings')
              .reduce((n, [, v]) => n + v, 0)
            return (
              <li key={b.id} className="flex items-center gap-3 px-5 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-ink">{b.reason}</p>
                  <p className="text-xs text-ink-faint">
                    {new Date(b.createdAt).toLocaleString()} · {formatDistanceToNow(b.createdAt, { addSuffix: true })} ·{' '}
                    {total.toLocaleString()} records
                  </p>
                </div>
                <Menu
                  trigger={(p) => <IconButton {...p} icon={RotateCcw} label="Backup options" size="sm" />}
                  items={[
                    {
                      label: 'Restore this backup',
                      icon: RotateCcw,
                      onSelect: async () => {
                        const ok = await confirm({
                          title: 'Restore this backup?',
                          message: 'Your current data is replaced by this backup. Current data is backed up first.',
                          confirmLabel: 'Restore',
                        })
                        if (!ok) return
                        await restoreBackup(b.id)
                        toast('Backup restored.', { tone: 'success' })
                      },
                    },
                    {
                      label: 'Download as file',
                      icon: Download,
                      onSelect: () => downloadJson(b.json, `alt-dashboard-backup-${new Date(b.createdAt).toISOString().slice(0, 10)}.json`),
                    },
                    'divider',
                    { label: 'Delete backup', icon: Trash2, danger: true, onSelect: () => db.backups.delete(b.id) },
                  ]}
                />
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
