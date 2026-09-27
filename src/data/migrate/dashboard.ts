import type { Bookmark, Roster, SettingRow, Template, Textbook, Widget, Workspace } from '../schema'
import type { ConversionResult } from './planner'
import { arr, idStr, int, isObj, objs, str, toMs, type Json } from './util'

/**
 * Converts data from the legacy classroom dashboard: the `livepoll`
 * IndexedDB (workspaces, settings, templates, textbooks) plus
 * `localStorage.customBookmarks`, and workspace template files
 * (`{ version: 2, name, widgets, bgIndex }`).
 */

export interface LegacyDashboardSnapshot {
  workspaces?: unknown[]
  /** `livepoll.settings` rows: `{ key, value }` */
  settings?: unknown[]
  templates?: unknown[]
  textbooks?: unknown[]
  bookmarks?: unknown[]
}

export interface DashboardData {
  workspaces: Workspace[]
  templates: Template[]
  rosters: Roster[]
  bookmarks: Bookmark[]
  /** Textbook links, to merge with planner textbooks. */
  textbooks: Textbook[]
  settings: SettingRow[]
}

export function isWorkspaceFile(json: unknown): json is Json {
  return isObj(json) && Array.isArray(json.widgets) && !('app' in json) && !('schools' in json)
}

export function convertWidgets(list: unknown): Widget[] {
  return objs(list)
    .filter((w) => typeof w.type === 'string')
    .map((w, i) => ({
      id: idStr(w.id) ?? `${str(w.type).toLowerCase().replace(/\s+/g, '-')}-${i}`,
      type: str(w.type),
      x: Number.isFinite(w.x) ? Number(w.x) : 80,
      y: Number.isFinite(w.y) ? Number(w.y) : 80,
      width: Number(w.width) > 0 ? Number(w.width) : 300,
      height: Number(w.height) > 0 ? Number(w.height) : 240,
      z: Number.isFinite(w.z) ? Number(w.z) : i + 1,
      locked: w.locked === true,
      config: isObj(w.config) ? w.config : {},
    }))
}

const bg = (v: unknown) => (typeof v === 'number' && Number.isInteger(v) && v >= 0 ? v : 0)

export function convertDashboard(snap: LegacyDashboardSnapshot, now = Date.now()): ConversionResult<DashboardData> {
  const warnings: string[] = []
  const notes: string[] = []
  const settingsMap = new Map(objs(snap.settings).map((r) => [str(r.key), r.value]))

  const workspaces: Workspace[] = objs(snap.workspaces).map((w, i) => ({
    id: idStr(w.id) ?? `workspace-${i + 1}`,
    name: str(w.name).trim() || `Workspace ${i + 1}`,
    order: i,
    widgets: convertWidgets(w.widgets),
    background: bg(w.bgIndex),
    createdAt: now,
    updatedAt: now,
  }))
  // Put the workspace that was active first.
  const active = str(settingsMap.get('activeWorkspace'))
  const activeIndex = workspaces.findIndex((w) => w.id === active)
  if (activeIndex > 0) {
    const [a] = workspaces.splice(activeIndex, 1)
    workspaces.unshift(a)
    workspaces.forEach((w, i) => (w.order = i))
  }

  const templates: Template[] = objs(snap.templates).map((t, i) => ({
    id: idStr(t.id) ?? `template-${i + 1}`,
    name: str(t.name).trim() || str(t.workspaceName).trim() || `Template ${i + 1}`,
    widgets: convertWidgets(t.widgets),
    background: bg(t.bgIndex),
    ...(() => {
      const c = toMs(t.createdAt, now)
      return { createdAt: c, updatedAt: c }
    })(),
  }))

  const rosters: Roster[] = objs(settingsMap.get('classes')).map((c, i) => {
    const count = int(c.count) ?? 0
    const names = arr(c.students)
      .map((s) => str(s).trim())
      .filter(Boolean)
    const numbered = c.type === 'number' || (!names.length && count > 0)
    return {
      id: idStr(c.id) ?? `class-${i + 1}`,
      name: str(c.name).trim() || `Class ${i + 1}`,
      kind: numbered ? 'number' : 'names',
      students: numbered ? Array.from({ length: Math.min(count, 200) }, (_, n) => String(n + 1)) : names,
      classKey: null,
      createdAt: now,
      updatedAt: now,
    }
  })

  const textbooks: Textbook[] = objs(snap.textbooks)
    .filter((t) => str(t.title).trim())
    .map((t, i) => ({
      id: idStr(t.id) ?? `tb-${i}`,
      title: str(t.title).trim(),
      cover: str(t.thumbnail),
      digitalUrl: str(t.url),
      altopediaUrl: '',
      preset: null,
      createdAt: now,
      updatedAt: now,
    }))

  const bookmarks: Bookmark[] = objs(snap.bookmarks)
    .filter((b) => str(b.url).trim())
    .map((b, i) => ({
      id: idStr(b.id) ?? `bookmark-${i + 1}`,
      name: str(b.name).trim() || str(b.url),
      url: str(b.url).trim(),
      image: str(b.image),
      order: i,
      kind: 'bookmark' as const,
      createdAt: now,
      updatedAt: now,
    }))

  const settings: SettingRow[] = []
  if (typeof settingsMap.get('rotateDailyBackground') === 'boolean')
    settings.push({ id: 'rotateBackground', value: settingsMap.get('rotateDailyBackground'), updatedAt: now })

  const widgetCount = workspaces.reduce((n, w) => n + w.widgets.length, 0)
  if (widgetCount)
    notes.push(
      'Widget settings (timer lengths, team names and so on) weren’t saved by the old dashboard, so widgets start with default settings.',
    )

  return { data: { workspaces, templates, rosters, bookmarks, textbooks, settings }, warnings, notes }
}

/** A single exported workspace/template file becomes one new workspace. */
export function convertWorkspaceFile(json: Json, now = Date.now()): Workspace {
  return {
    id: `workspace-${now}`,
    name: str(json.name).trim() || 'Imported workspace',
    order: 0,
    widgets: convertWidgets(json.widgets),
    background: bg(json.bgIndex),
    createdAt: now,
    updatedAt: now,
  }
}
