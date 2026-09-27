import { db } from '@/data/db'
import { patch, remove, save, saveMany } from '@/data/repo'
import type { Roster, Template, Widget, Workspace } from '@/data/schema'
import { cloneWidgets } from './model'

/*
 * Workspace, template and class-list changes. Destructive ones return an
 * Undo function for the toast.
 */

export type Undo = () => Promise<unknown>

export async function addWorkspace(name?: string, widgets: Widget[] = [], background = 0): Promise<Workspace> {
  const all = await db.workspaces.toArray()
  const order = all.reduce((m, w) => Math.max(m, w.order), -1) + 1
  return save('workspaces', { name: name?.trim() || `Workspace ${all.length + 1}`, order, widgets, background })
}

export const renameWorkspace = (id: string, name: string) => patch('workspaces', id, { name: name.trim() || 'Untitled' })

export const setWorkspaceBackground = (id: string, background: number) => patch('workspaces', id, { background })

export async function deleteWorkspace(ws: Workspace): Promise<Undo> {
  await remove('workspaces', ws.id)
  return () => save('workspaces', ws)
}

/** Move a workspace one place earlier (-1) or later (+1), renumbering the order. */
export async function moveWorkspace(list: Workspace[], id: string, dir: -1 | 1) {
  const i = list.findIndex((w) => w.id === id)
  const j = i + dir
  if (i < 0 || j < 0 || j >= list.length) return
  const next = [...list]
  ;[next[i], next[j]] = [next[j], next[i]]
  await saveMany(
    'workspaces',
    next.map((w, order) => ({ ...w, order })),
  )
}

export const saveTemplate = (name: string, widgets: Widget[], background: number) =>
  save('templates', { name: name.trim() || 'Template', widgets: cloneWidgets(widgets), background })

export const renameTemplate = (id: string, name: string) => patch('templates', id, { name: name.trim() || 'Template' })

export async function deleteTemplate(t: Template): Promise<Undo> {
  await remove('templates', t.id)
  return () => save('templates', t)
}

export const saveRoster = (r: Omit<Roster, 'id' | 'createdAt' | 'updatedAt'> & Partial<Pick<Roster, 'id' | 'createdAt'>>) =>
  save('rosters', r)

export async function deleteRoster(r: Roster): Promise<Undo> {
  await remove('rosters', r.id)
  return () => save('rosters', r)
}
