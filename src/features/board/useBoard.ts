import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/data/db'
import { patch } from '@/data/repo'
import type { Widget, Workspace } from '@/data/schema'
import { useSettings } from '@/data/settings'
import { sanitizeWidgets } from './model'

const SAVE_DELAY = 400

/**
 * Create the first workspace. Fixed id and time 0, so a double call is
 * harmless and a synced workspace from another device always wins over it.
 */
export const ensureDefaultWorkspace = () =>
  db.workspaces.put({ id: 'workspace-1', name: 'Workspace 1', order: 0, widgets: [], background: 0, createdAt: 0, updatedAt: 0 })

/** Workspaces in order, the active one, and a way to switch. */
export function useWorkspaces() {
  const { settings, setSetting, loaded } = useSettings()
  const workspaces = useLiveQuery(() => db.workspaces.orderBy('order').toArray(), [])

  useEffect(() => {
    if (workspaces && workspaces.length === 0) void ensureDefaultWorkspace()
  }, [workspaces])

  const active = workspaces?.find((w) => w.id === settings.activeWorkspace) ?? workspaces?.[0]
  const select = useCallback((id: string) => setSetting('activeWorkspace', id), [setSetting])
  return { workspaces, active, select, ready: loaded && !!workspaces?.length && !!active }
}

/**
 * The active workspace's widgets as local state, so dragging is smooth.
 * Changes are written back 400 ms after they stop (and straight away when
 * switching workspace or leaving the board).
 */
export function useWidgets(ws: Workspace | undefined) {
  const [widgets, setWidgets] = useState<Widget[]>([])
  const current = useRef<Widget[]>([])
  const pending = useRef<{ id: string; widgets: Widget[] } | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)
  const wsId = ws?.id

  const flush = useCallback(() => {
    clearTimeout(timer.current)
    const p = pending.current
    pending.current = null
    if (p) void patch('workspaces', p.id, { widgets: p.widgets })
  }, [])

  // Load from the database unless local edits are waiting to be saved.
  useEffect(() => {
    if (!ws || pending.current?.id === ws.id) return
    const list = sanitizeWidgets(ws.widgets)
    current.current = list
    setWidgets(list)
  }, [ws])

  // Save before switching workspace or unmounting.
  useEffect(() => flush, [wsId, flush])
  useEffect(() => {
    window.addEventListener('pagehide', flush)
    return () => window.removeEventListener('pagehide', flush)
  }, [flush])

  const change = useCallback(
    (fn: (list: Widget[]) => Widget[]) => {
      if (!wsId) return
      const next = fn(current.current)
      if (next === current.current) return
      current.current = next
      setWidgets(next)
      pending.current = { id: wsId, widgets: next }
      clearTimeout(timer.current)
      timer.current = setTimeout(flush, SAVE_DELAY)
    },
    [wsId, flush],
  )

  const api = useMemo(
    () => ({
      change,
      flush,
      /** Latest list (for event handlers that run between renders). */
      get: () => current.current,
      update: (id: string, changes: Partial<Widget>) => change((list) => list.map((w) => (w.id === id ? { ...w, ...changes } : w))),
      updateConfig: (id: string, changes: Record<string, unknown>) =>
        change((list) => list.map((w) => (w.id === id ? { ...w, config: { ...w.config, ...changes } } : w))),
      remove: (id: string) => change((list) => list.filter((w) => w.id !== id)),
      toFront: (id: string) =>
        change((list) => {
          const top = Math.max(0, ...list.map((w) => w.z))
          const w = list.find((x) => x.id === id)
          if (!w || (w.z === top && list.filter((x) => x.z === top).length === 1)) return list
          return list.map((x) => (x.id === id ? { ...x, z: top + 1 } : x))
        }),
      toBack: (id: string) =>
        change((list) => {
          const bottom = Math.min(...list.map((w) => w.z))
          return list.map((x) => (x.id === id ? { ...x, z: bottom - 1 } : x))
        }),
    }),
    [change, flush],
  )

  return { widgets, ...api }
}
