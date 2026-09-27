import type { Widget } from '@/data/schema'

/*
 * Widget metadata and pure layout helpers. Type names match the old
 * dashboard's registry keys so migrated workspaces load unchanged.
 */

export type WidgetCategory = 'time' | 'students' | 'interact' | 'fun' | 'display' | 'tools'

export const CATEGORIES: { id: WidgetCategory; label: string }[] = [
  { id: 'time', label: 'Time' },
  { id: 'students', label: 'Students' },
  { id: 'interact', label: 'Interactive' },
  { id: 'fun', label: 'Fun' },
  { id: 'display', label: 'Display' },
  { id: 'tools', label: 'Tools' },
]

export interface WidgetMeta {
  type: string
  category: WidgetCategory
  description: string
  /** Design size (the size a new widget opens at). */
  w: number
  h: number
  minW: number
  minH: number
  /** Scale the body to fit the frame (true) or lay it out at the frame's size (false). */
  scaleContent: boolean
  /** Full-screen, frameless overlay (Drawing). */
  overlay?: boolean
}

const meta = (m: Omit<WidgetMeta, 'minW' | 'minH' | 'scaleContent'> & Partial<WidgetMeta>): WidgetMeta => ({
  minW: m.w,
  minH: m.h,
  scaleContent: true,
  ...m,
})

export const WIDGET_META: WidgetMeta[] = [
  meta({ type: 'Timer', category: 'time', description: 'Countdown with an alarm', w: 220, h: 248, minW: 160, minH: 172 }),
  meta({ type: 'Stopwatch', category: 'time', description: 'Count up, with laps', w: 220, h: 248, minW: 160, minH: 172 }),
  meta({
    type: 'Clock',
    category: 'time',
    description: 'Digital or analogue clock',
    w: 288,
    h: 156,
    minW: 200,
    minH: 120,
    scaleContent: false,
  }),
  meta({ type: 'Random Name', category: 'students', description: 'Pick a student at random', w: 260, h: 272, minW: 200, minH: 210 }),
  meta({
    type: 'Group Maker',
    category: 'students',
    description: 'Shuffle a class into groups',
    w: 320,
    h: 360,
    minW: 240,
    minH: 240,
    scaleContent: false,
  }),
  meta({ type: 'Scoreboard', category: 'students', description: 'Team scores', w: 260, h: 220, minW: 200, minH: 160, scaleContent: false }),
  meta({
    type: 'Poll',
    category: 'interact',
    description: 'Live poll students join by QR code',
    w: 360,
    h: 480,
    minW: 280,
    minH: 340,
    scaleContent: false,
  }),
  meta({ type: 'Dice', category: 'fun', description: 'Roll 1–6 dice', w: 220, h: 248, minW: 160, minH: 172 }),
  meta({ type: 'Spinner', category: 'fun', description: 'Spin the wheel', w: 360, h: 460, minW: 260, minH: 320, scaleContent: false }),
  meta({
    type: 'Text',
    category: 'display',
    description: 'Big announcement text',
    w: 300,
    h: 180,
    minW: 160,
    minH: 100,
    scaleContent: false,
  }),
  meta({
    type: 'Checklist',
    category: 'display',
    description: 'Tick off steps and tasks',
    w: 300,
    h: 360,
    minW: 220,
    minH: 200,
    scaleContent: false,
  }),
  meta({
    type: 'Traffic Light',
    category: 'display',
    description: 'Red, amber, green signals',
    w: 180,
    h: 280,
    minW: 120,
    minH: 200,
    scaleContent: false,
  }),
  meta({
    type: 'Upcoming Lessons',
    category: 'display',
    description: 'Your next classes from the planner',
    w: 360,
    h: 320,
    minW: 260,
    minH: 200,
    scaleContent: false,
  }),
  meta({
    type: 'Sound Level',
    category: 'tools',
    description: 'Classroom noise meter',
    w: 240,
    h: 250,
    minW: 180,
    minH: 200,
    scaleContent: false,
  }),
  meta({
    type: 'Drawing',
    category: 'tools',
    description: 'Draw over the whole board',
    w: 1280,
    h: 720,
    minW: 320,
    minH: 240,
    scaleContent: false,
    overlay: true,
  }),
  meta({
    type: 'QR Code',
    category: 'tools',
    description: 'Show a link as a QR code',
    w: 240,
    h: 280,
    minW: 160,
    minH: 190,
    scaleContent: false,
  }),
]

export const META_BY_TYPE = new Map(WIDGET_META.map((m) => [m.type, m]))

/** Quick-add buttons in the dock (same six as the old dashboard). */
export const DOCK_TYPES = ['Timer', 'Stopwatch', 'Clock', 'Random Name', 'Group Maker', 'Scoreboard']

export const GRID = 20
export const snap = (v: number, on: boolean) => (on ? Math.round(v / GRID) * GRID : Math.round(v))

export const widgetId = (type: string) => `${type.toLowerCase().replace(/\s+/g, '-')}-${crypto.randomUUID().slice(0, 8)}`

export const topZ = (widgets: Widget[]) => widgets.reduce((z, w) => Math.max(z, w.z), 0)

/**
 * A new widget, cascading from the top-left like the old dashboard
 * (x = 60 + n·45 mod 400, y = 40 + n·45 mod 260). Drawing fills the board.
 */
export function createWidget(type: string, existing: Widget[], board: { width: number; height: number }): Widget {
  const m = META_BY_TYPE.get(type)
  if (!m) throw new Error(`Unknown widget type: ${type}`)
  const n = existing.length
  const base = { id: widgetId(type), type, z: topZ(existing) + 1, locked: false, config: {} }
  if (m.overlay) return { ...base, x: 0, y: 0, width: board.width, height: board.height }
  const width = Math.min(m.w, Math.max(m.minW, board.width - 32))
  const height = Math.min(m.h, Math.max(m.minH, board.height - 32))
  const x = Math.min(60 + ((n * 45) % 400), Math.max(0, board.width - width))
  const y = Math.min(80 + ((n * 45) % 260), Math.max(0, board.height - height))
  return { ...base, x, y, width, height }
}

/**
 * Clamp sizes to each widget's minimum. Unknown types (e.g. a widget from a
 * newer version) are kept as they are, but not drawn, so saving never loses them.
 */
export function sanitizeWidgets(widgets: Widget[]): Widget[] {
  return widgets.map((w) => {
    const m = META_BY_TYPE.get(w.type)
    return m ? { ...w, width: Math.max(w.width, m.minW), height: Math.max(w.height, m.minH) } : w
  })
}

/**
 * Where a widget is drawn on a board of this size: saved positions are kept,
 * but widgets from a bigger screen are pulled back so they stay reachable.
 */
export function placeOnBoard(w: Widget, board: { width: number; height: number }) {
  const m = META_BY_TYPE.get(w.type)
  if (m?.overlay) return { x: 0, y: 0, width: board.width, height: board.height }
  const width = Math.min(w.width, Math.max(m?.minW ?? 120, board.width))
  const height = Math.min(w.height, Math.max(m?.minH ?? 100, board.height))
  const x = Math.max(0, Math.min(w.x, board.width - Math.min(width, 120)))
  const y = Math.max(0, Math.min(w.y, board.height - Math.min(height, 60)))
  return { x, y, width, height }
}

/** Copy widgets with fresh ids (applying a template, duplicating). */
export const cloneWidgets = (widgets: Widget[]) => widgets.map((w) => ({ ...w, id: widgetId(w.type), config: structuredClone(w.config) }))

/** Workspace export file, compatible with the old dashboard's template JSON (`version: 2`). */
export const workspaceFile = (name: string, widgets: Widget[], background: number) => ({
  version: 2,
  name,
  widgets,
  bgIndex: background,
  exportedAt: new Date().toISOString(),
})

export const fileSafe = (name: string) => name.replace(/[^\w\- ]+/g, '').trim() || 'workspace'
