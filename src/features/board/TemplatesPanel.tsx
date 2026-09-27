import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { format } from 'date-fns'
import { Download, LayoutTemplate, Save, Trash2 } from 'lucide-react'
import { Button, EmptyState, IconButton, Input, useFeedback } from '@/components/ui'
import { db } from '@/data/db'
import type { Template, Widget, Workspace } from '@/data/schema'
import { downloadJson } from '@/data/transfer'
import { deleteTemplate, renameTemplate, saveTemplate, setWorkspaceBackground } from './actions'
import { BACKGROUNDS } from './backgrounds'
import { cloneWidgets, fileSafe, workspaceFile } from './model'

interface Props {
  active: Workspace
  widgets: Widget[]
  setWidgets: (fn: (list: Widget[]) => Widget[]) => void
}

export function TemplatesPanel({ active, widgets, setWidgets }: Props) {
  const { toast, confirm } = useFeedback()
  const templates = useLiveQuery(() => db.templates.orderBy('updatedAt').reverse().toArray(), [])
  const [name, setName] = useState('')

  const apply = async (t: Template) => {
    if (widgets.length) {
      const ok = await confirm({
        title: `Use “${t.name}” here?`,
        message: `This replaces the ${widgets.length} widget${widgets.length === 1 ? '' : 's'} on “${active.name}”. You can undo it.`,
        confirmLabel: 'Use template',
      })
      if (!ok) return
    }
    const before = { widgets, background: active.background }
    setWidgets(() => cloneWidgets(t.widgets))
    void setWorkspaceBackground(active.id, t.background)
    toast(`Applied “${t.name}”`, {
      action: {
        label: 'Undo',
        onClick: () => {
          setWidgets(() => before.widgets)
          void setWorkspaceBackground(active.id, before.background)
        },
      },
    })
  }

  const del = async (t: Template) => {
    const undo = await deleteTemplate(t)
    toast(`Deleted template “${t.name}”`, { action: { label: 'Undo', onClick: () => void undo() } })
  }

  return (
    <div className="space-y-5">
      <form
        className="flex flex-wrap items-end gap-2"
        onSubmit={async (e) => {
          e.preventDefault()
          const t = await saveTemplate(name || active.name, widgets, active.background)
          setName('')
          toast(`Saved template “${t.name}”`, { tone: 'success' })
        }}
      >
        <label className="min-w-48 flex-1 space-y-1.5">
          <span className="block text-xs font-semibold tracking-wide text-ink-soft uppercase">Save this workspace as a template</span>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={active.name} aria-label="Template name" />
        </label>
        <Button type="submit" variant="primary" icon={Save} disabled={!widgets.length}>
          Save template
        </Button>
      </form>

      {templates && !templates.length ? (
        <EmptyState
          icon={LayoutTemplate}
          title="No templates yet"
          description="Save a layout you use often, then put it on any workspace in one click."
        />
      ) : (
        <ul className="space-y-2">
          {templates?.map((t) => (
            <li key={t.id} className="flex flex-wrap items-center gap-2 rounded-xl border border-line p-2">
              <span
                className="aspect-video w-16 shrink-0 rounded-lg ring-1 ring-black/10"
                style={{ background: (BACKGROUNDS[t.background] ?? BACKGROUNDS[0]).thumb }}
                aria-hidden
              />
              <div className="min-w-40 flex-1">
                <Input
                  aria-label="Template name"
                  defaultValue={t.name}
                  key={t.name}
                  onBlur={(e) => e.target.value !== t.name && void renameTemplate(t.id, e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
                  className="h-9"
                />
                <p className="mt-1 truncate px-1 text-xs text-ink-faint">
                  {t.widgets.length} widgets · {t.widgets.map((w) => w.type).join(', ')} · {format(t.updatedAt, 'd MMM yyyy')}
                </p>
              </div>
              <Button size="sm" variant="subtle" onClick={() => void apply(t)}>
                Use here
              </Button>
              <IconButton
                icon={Download}
                size="sm"
                label={`Export ${t.name}`}
                onClick={() =>
                  downloadJson(JSON.stringify(workspaceFile(t.name, t.widgets, t.background), null, 2), `${fileSafe(t.name)}-template.json`)
                }
              />
              <IconButton icon={Trash2} size="sm" label={`Delete ${t.name}`} onClick={() => void del(t)} />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
