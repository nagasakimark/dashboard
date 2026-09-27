import { useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { formatDistanceToNow } from 'date-fns'
import { Archive, Database, Download, FileWarning, RotateCcw, Trash2, Upload } from 'lucide-react'
import { Badge, Button, Card, CardHeader, Dialog, IconButton, Menu, useFeedback } from '@/components/ui'
import { db } from '@/data/db'
import { SYNCED_TABLES } from '@/data/schema'
import { buildExport, createBackup, downloadJson, exportFileName, replaceAllData, restoreBackup, type ExportFile } from '@/data/transfer'
import { readImportFile, type ImportPlan } from '@/data/importFile'
import { TABLE_LABELS } from '@/data/labels'

function CountsList({ counts }: { counts: Record<string, number> }) {
  const shown = Object.entries(counts).filter(([k, n]) => n > 0 && k !== 'settings')
  if (!shown.length) return <p className="text-sm text-ink-faint">No records.</p>
  return (
    <dl className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-sm sm:grid-cols-3">
      {shown.map(([k, n]) => (
        <div key={k} className="flex justify-between gap-2 border-b border-line/60 py-1">
          <dt className="text-ink-soft">{TABLE_LABELS[k] ?? k}</dt>
          <dd className="font-semibold tabular-nums">{n.toLocaleString()}</dd>
        </div>
      ))}
    </dl>
  )
}

export function DataSection() {
  const { toast, confirm } = useFeedback()
  const fileInput = useRef<HTMLInputElement>(null)
  const [plan, setPlan] = useState<ImportPlan | null>(null)
  const [busy, setBusy] = useState(false)
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

  const applyImport = async (file: ExportFile) => {
    setBusy(true)
    try {
      const backup = await replaceAllData(file, `Before importing ${plan?.fileName ?? 'a file'}`)
      setPlan(null)
      undoable('Import complete. Your previous data was backed up.', backup.id)
    } catch (e) {
      toast(`Import failed: ${e instanceof Error ? e.message : e}`, { tone: 'error' })
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

      <Dialog
        open={!!plan}
        onClose={() => !busy && setPlan(null)}
        dismissible={!busy}
        size="lg"
        title="Import data"
        description={plan?.fileName}
        footer={
          plan?.file && (
            <>
              <Button variant="ghost" onClick={() => setPlan(null)} disabled={busy}>
                Cancel
              </Button>
              <Button variant="primary" onClick={() => applyImport(plan.file!)} disabled={busy}>
                {busy ? 'Importing…' : 'Replace my data with this file'}
              </Button>
            </>
          )
        }
      >
        {plan && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="accent">{plan.formatLabel}</Badge>
              {plan.file && <span className="text-sm text-ink-soft">This file contains:</span>}
            </div>
            {plan.file && <CountsList counts={plan.counts} />}

            {plan.errors.length > 0 && (
              <div className="rounded-xl border border-danger/25 bg-danger/5 p-3 text-sm text-danger">
                <p className="flex items-center gap-2 font-semibold">
                  <FileWarning size={16} aria-hidden /> This file can’t be imported
                </p>
                <ul className="mt-1 list-disc pl-5 text-xs">
                  {plan.errors.slice(0, 8).map((e) => (
                    <li key={e}>{e}</li>
                  ))}
                </ul>
              </div>
            )}

            {plan.warnings.length > 0 && (
              <div className="rounded-xl border border-warning/30 bg-warning/5 p-3 text-sm">
                <p className="font-semibold text-warning">Worth checking after import</p>
                <ul className="mt-1 list-disc pl-5 text-xs text-ink-soft">
                  {plan.warnings.map((w) => (
                    <li key={w}>{w}</li>
                  ))}
                </ul>
              </div>
            )}

            {plan.file && (
              <p className="rounded-xl bg-accent-soft p-3 text-sm text-accent-strong">
                Importing <strong>replaces everything</strong> on this device. Your current data is backed up first, and you can undo right
                after.
              </p>
            )}
          </div>
        )}
      </Dialog>
    </>
  )
}
