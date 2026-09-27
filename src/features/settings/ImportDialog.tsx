import { useState } from 'react'
import { FileWarning, Info, ShieldCheck } from 'lucide-react'
import { Badge, Button, Dialog, useFeedback } from '@/components/ui'
import type { ImportPlan } from '@/data/importFile'
import { TABLE_LABELS } from '@/data/labels'
import { restoreBackup } from '@/data/transfer'

export function CountsList({ counts }: { counts: Record<string, number> }) {
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

interface ImportDialogProps {
  plan: ImportPlan | null
  onClose: () => void
  /** Called after a successful import. */
  onDone?: () => void
  title?: string
  confirmLabel?: string
}

/** Preview of an import (format, counts, problems) with the confirm step. */
export function ImportDialog({ plan, onClose, onDone, title = 'Import data', confirmLabel }: ImportDialogProps) {
  const { toast } = useFeedback()
  const [busy, setBusy] = useState(false)

  const run = async () => {
    if (!plan?.apply) return
    setBusy(true)
    try {
      const backupId = await plan.apply()
      onClose()
      onDone?.()
      if (backupId)
        toast('Import complete. Your previous data was backed up.', {
          tone: 'success',
          action: {
            label: 'Undo',
            onClick: async () => {
              await restoreBackup(backupId)
              toast('Restored your previous data.', { tone: 'success' })
            },
          },
        })
      else toast('Import complete.', { tone: 'success' })
    } catch (e) {
      toast(`Import failed: ${e instanceof Error ? e.message : String(e)}`, { tone: 'error' })
    } finally {
      setBusy(false)
    }
  }

  const replace = plan?.mode === 'replace'
  return (
    <Dialog
      open={!!plan}
      onClose={() => !busy && onClose()}
      dismissible={!busy}
      size="lg"
      title={title}
      description={plan?.fileName}
      footer={
        plan?.apply && (
          <>
            <Button variant="ghost" onClick={onClose} disabled={busy}>
              Cancel
            </Button>
            <Button variant="primary" onClick={run} disabled={busy}>
              {busy ? 'Importing…' : (confirmLabel ?? (replace ? 'Replace my data with this' : 'Add to my data'))}
            </Button>
          </>
        )
      }
    >
      {plan && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="accent">{plan.formatLabel}</Badge>
            {plan.apply && <span className="text-sm text-ink-soft">{replace ? 'This will import:' : 'This will add:'}</span>}
          </div>
          {plan.apply && <CountsList counts={plan.counts} />}

          {plan.errors.length > 0 && (
            <div className="rounded-xl border border-danger/25 bg-danger/5 p-3 text-sm text-danger">
              <p className="flex items-center gap-2 font-semibold">
                <FileWarning size={16} aria-hidden /> This can’t be imported
              </p>
              <ul className="mt-1 list-disc pl-5 text-xs">
                {plan.errors.slice(0, 10).map((e) => (
                  <li key={e}>{e}</li>
                ))}
              </ul>
            </div>
          )}

          {plan.warnings.length > 0 && (
            <div className="rounded-xl border border-warning/30 bg-warning/5 p-3 text-sm">
              <p className="font-semibold text-warning">Worth checking after import</p>
              <ul className="mt-1 list-disc space-y-0.5 pl-5 text-xs text-ink-soft">
                {plan.warnings.map((w) => (
                  <li key={w}>{w}</li>
                ))}
              </ul>
            </div>
          )}

          {plan.notes.length > 0 && (
            <div className="rounded-xl bg-canvas p-3 text-sm">
              <p className="flex items-center gap-2 font-semibold text-ink">
                <Info size={15} aria-hidden /> Good to know
              </p>
              <ul className="mt-1 list-disc space-y-0.5 pl-5 text-xs text-ink-soft">
                {plan.notes.map((n) => (
                  <li key={n}>{n}</li>
                ))}
              </ul>
            </div>
          )}

          {plan.apply && replace && (
            <div className="rounded-xl bg-accent-soft p-3 text-sm text-accent-strong">
              <p className="flex items-center gap-2 font-semibold">
                <ShieldCheck size={16} aria-hidden /> Replaces the data on this device
              </p>
              <p className="mt-1 text-xs">
                Your current data is backed up first, and you can undo straight after.
                {plan.keeps.length > 0 && <> Kept as they are: {plan.keeps.join('; ').toLowerCase()}.</>}
              </p>
            </div>
          )}
        </div>
      )}
    </Dialog>
  )
}
