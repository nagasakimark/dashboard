import { useRef } from 'react'
import { ArrowDown, ArrowUp, Download, Eraser, Plus, Trash2, Upload } from 'lucide-react'
import { Badge, Button, IconButton, Input, useFeedback } from '@/components/ui'
import type { Widget, Workspace } from '@/data/schema'
import { convertWidgets } from '@/data/migrate/dashboard'
import { downloadJson } from '@/data/transfer'
import { cn } from '@/lib/cn'
import { addWorkspace, deleteWorkspace, moveWorkspace, renameWorkspace } from './actions'
import { fileSafe, workspaceFile } from './model'

interface Props {
  workspaces: Workspace[]
  active: Workspace
  widgets: Widget[]
  select: (id: string) => void
  setWidgets: (fn: (list: Widget[]) => Widget[]) => void
}

export function WorkspacesPanel({ workspaces, active, widgets, select, setWidgets }: Props) {
  const { toast, confirm } = useFeedback()
  const fileInput = useRef<HTMLInputElement>(null)

  const del = async (ws: Workspace) => {
    const ok = await confirm({
      title: `Delete “${ws.name}”?`,
      message: `Its ${ws.widgets.length} widget${ws.widgets.length === 1 ? '' : 's'} and their settings will be removed.`,
      confirmLabel: 'Delete',
      danger: true,
    })
    if (!ok) return
    if (ws.id === active.id) select(workspaces.find((w) => w.id !== ws.id)!.id)
    const undo = await deleteWorkspace(ws)
    toast(`Deleted “${ws.name}”`, { action: { label: 'Undo', onClick: () => void undo() } })
  }

  const clear = () => {
    const before = widgets
    setWidgets(() => [])
    toast(`Cleared ${before.length} widget${before.length === 1 ? '' : 's'}`, {
      action: { label: 'Undo', onClick: () => setWidgets(() => before) },
    })
  }

  const importFile = async (file: File) => {
    try {
      const json = JSON.parse(await file.text()) as { name?: unknown; widgets?: unknown; bgIndex?: unknown; background?: unknown }
      if (!Array.isArray(json.widgets)) throw new Error('no widgets')
      const bg = typeof json.bgIndex === 'number' ? json.bgIndex : typeof json.background === 'number' ? json.background : 0
      const ws = await addWorkspace(
        typeof json.name === 'string' ? json.name : file.name.replace(/\.json$/i, ''),
        convertWidgets(json.widgets),
        bg,
      )
      select(ws.id)
      toast(`Imported “${ws.name}”`, { tone: 'success' })
    } catch {
      toast('That file isn’t a workspace or template export.', { tone: 'error' })
    }
  }

  return (
    <div className="space-y-5">
      <ul className="space-y-2">
        {workspaces.map((ws, i) => (
          <li
            key={ws.id}
            className={cn(
              'flex items-center gap-2 rounded-xl border p-2',
              ws.id === active.id ? 'border-accent-muted bg-accent-soft/40' : 'border-line',
            )}
          >
            <div className="flex flex-col">
              <IconButton
                icon={ArrowUp}
                size="sm"
                label={`Move ${ws.name} up`}
                disabled={i === 0}
                onClick={() => void moveWorkspace(workspaces, ws.id, -1)}
                className="size-6"
              />
              <IconButton
                icon={ArrowDown}
                size="sm"
                label={`Move ${ws.name} down`}
                disabled={i === workspaces.length - 1}
                onClick={() => void moveWorkspace(workspaces, ws.id, 1)}
                className="size-6"
              />
            </div>
            <Input
              aria-label={`Name of workspace ${i + 1}`}
              defaultValue={ws.name}
              key={ws.name}
              onBlur={(e) => e.target.value !== ws.name && void renameWorkspace(ws.id, e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
              className="h-9 flex-1"
            />
            <Badge>{ws.widgets.length} widgets</Badge>
            {ws.id === active.id ? (
              <Badge tone="accent">Showing</Badge>
            ) : (
              <Button size="sm" onClick={() => select(ws.id)}>
                Show
              </Button>
            )}
            <IconButton
              icon={Trash2}
              size="sm"
              label={`Delete ${ws.name}`}
              disabled={workspaces.length <= 1}
              onClick={() => void del(ws)}
            />
          </li>
        ))}
      </ul>
      <div className="flex flex-wrap gap-2">
        <Button
          icon={Plus}
          variant="primary"
          onClick={async () => {
            const ws = await addWorkspace()
            select(ws.id)
          }}
        >
          New workspace
        </Button>
        <Button icon={Eraser} disabled={!widgets.length} onClick={clear}>
          Clear this workspace
        </Button>
        <Button
          icon={Download}
          onClick={() =>
            downloadJson(
              JSON.stringify(workspaceFile(active.name, widgets, active.background), null, 2),
              `${fileSafe(active.name)}-template.json`,
            )
          }
        >
          Export this workspace
        </Button>
        <Button icon={Upload} onClick={() => fileInput.current?.click()}>
          Import workspace
        </Button>
        <input
          ref={fileInput}
          type="file"
          accept="application/json,.json"
          hidden
          aria-label="Import workspace file"
          onChange={(e) => {
            const f = e.target.files?.[0]
            e.target.value = ''
            if (f) void importFile(f)
          }}
        />
      </div>
    </div>
  )
}
