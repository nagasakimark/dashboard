import { format } from 'date-fns'
import { useCallback, useLayoutEffect, useRef, useState, type ButtonHTMLAttributes, type ReactNode, type Ref } from 'react'
import {
  ArrowLeft,
  BookOpen,
  Bookmark,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Expand,
  FileText,
  Gamepad2,
  Image,
  Keyboard,
  Layers,
  MonitorPlay,
  Plus,
  Puzzle,
  Settings,
  Shrink,
  type LucideIcon,
} from 'lucide-react'
import { Link } from 'react-router'
import { Dialog, Menu } from '@/components/ui'
import type { Workspace } from '@/data/schema'
import { cn } from '@/lib/cn'
import { useNow } from '@/lib/useNow'
import { STATIQ } from '@/app/apps'
import { DOCK_TYPES } from './model'
import { WIDGETS } from './registry'

// The old dashboard's look: frosted white bars with slate icons.
const glass = 'bg-white/85 text-slate-600 shadow-xl ring-1 ring-black/5 backdrop-blur-xl'
const glassButton =
  'inline-flex items-center justify-center gap-1.5 rounded-xl transition-colors hover:bg-white hover:text-slate-900 active:bg-slate-100 disabled:opacity-40'

export function TopLeft({ onSettings }: { onSettings: () => void }) {
  const now = useNow(10_000)
  return (
    <div className={cn('absolute top-3 left-3 z-[9500] flex items-center gap-1 rounded-2xl p-1', glass)}>
      <Link to="/" className={cn(glassButton, 'h-9 px-2.5 text-sm font-semibold')} title="Back to the planner">
        <ArrowLeft size={17} aria-hidden />
        <span className="hidden sm:inline">Planner</span>
      </Link>
      <button type="button" className={cn(glassButton, 'size-9')} aria-label="Board settings" title="Board settings" onClick={onSettings}>
        <Settings size={18} aria-hidden />
      </button>
      <time className="hidden px-2 text-lg font-bold text-slate-700 tabular-nums sm:block" dateTime={now.toISOString()}>
        {format(now, 'H:mm')}
      </time>
    </div>
  )
}

export function WorkspaceSwitcher({
  workspaces,
  active,
  select,
  add,
  manage,
}: {
  workspaces: Workspace[]
  active: Workspace
  select: (id: string) => void
  add: () => void
  manage: () => void
}) {
  const i = workspaces.findIndex((w) => w.id === active.id)
  const step = (d: number) => select(workspaces[(i + d + workspaces.length) % workspaces.length].id)
  return (
    <nav aria-label="Workspaces" className={cn('absolute top-3 right-3 z-[9500] flex items-center gap-0.5 rounded-2xl p-1', glass)}>
      <button
        type="button"
        className={cn(glassButton, 'size-9')}
        aria-label="Previous workspace"
        title="Previous workspace ([)"
        disabled={workspaces.length < 2}
        onClick={() => step(-1)}
      >
        <ChevronLeft size={18} aria-hidden />
      </button>
      <Menu
        trigger={(p) => (
          <button
            type="button"
            className={cn(glassButton, 'h-9 max-w-[36vw] px-2 text-sm font-semibold sm:max-w-[44vw]')}
            {...p}
            aria-label={`Workspace: ${active.name}`}
          >
            <span className="truncate">{active.name}</span>
            <span className="text-xs font-medium text-slate-400 tabular-nums">
              {i + 1}/{workspaces.length}
            </span>
            <ChevronDown size={14} aria-hidden />
          </button>
        )}
        items={[
          ...workspaces.map((w, n) => ({ label: `${n + 1}. ${w.name}`, onSelect: () => select(w.id) })),
          'divider' as const,
          { label: 'New workspace', icon: Plus, onSelect: add },
          { label: 'Manage workspaces…', icon: Layers, onSelect: manage },
        ]}
      />
      <button
        type="button"
        className={cn(glassButton, 'size-9')}
        aria-label="Next workspace"
        title="Next workspace (])"
        disabled={workspaces.length < 2}
        onClick={() => step(1)}
      >
        <ChevronRight size={18} aria-hidden />
      </button>
      <span className="hidden sm:contents">
        <button type="button" className={cn(glassButton, 'size-9')} aria-label="New workspace" title="New workspace" onClick={add}>
          <Plus size={18} aria-hidden />
        </button>
      </span>
    </nav>
  )
}

export type DockPanel = 'textbooks' | 'activities' | 'bookmarks' | 'games' | 'background'

const PANELS: { id: DockPanel; label: string; icon: LucideIcon; key: string }[] = [
  { id: 'textbooks', label: 'Textbooks', icon: BookOpen, key: 'T' },
  { id: 'activities', label: 'Activities', icon: Gamepad2, key: 'L' },
  { id: 'games', label: 'Games', icon: Puzzle, key: 'G' },
  { id: 'bookmarks', label: 'Bookmarks', icon: Bookmark, key: '' },
  { id: 'background', label: 'Background', icon: Image, key: 'B' },
]

/** A dock icon with the old dashboard's lift-on-hover and a label bubble. */
function DockButton({
  icon: Icon,
  label,
  hint,
  highlight,
  pressed,
  ...rest
}: {
  icon: LucideIcon
  label: string
  hint?: string
  highlight?: boolean
  pressed?: boolean
  ref?: Ref<HTMLButtonElement>
} & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-expanded={pressed}
      className={cn(
        'group relative grid size-11 shrink-0 place-items-center rounded-xl transition-all duration-200 hover:-translate-y-1',
        highlight ? 'bg-accent-soft text-accent hover:bg-accent-muted/60' : 'text-slate-500 hover:bg-white hover:text-slate-900',
        pressed && 'bg-white text-accent shadow-sm ring-1 ring-slate-200',
      )}
      {...rest}
    >
      <Icon size={20} strokeWidth={2} aria-hidden className="transition-transform group-hover:scale-110" />
      <span className="pointer-events-none absolute -top-8 rounded-md bg-slate-800 px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap text-white opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
        {label}
        {hint ? <span className="ml-1 text-slate-400">{hint}</span> : null}
      </span>
    </button>
  )
}

const Divider = () => <span className="mx-0.5 h-8 w-px shrink-0 bg-slate-200/80" aria-hidden />

export function Dock({
  onAdd,
  onMore,
  panel,
  setPanel,
  renderPanel,
  onPresent,
  onFullscreen,
  fullscreen,
}: {
  onAdd: (type: string) => void
  onMore: () => void
  panel: DockPanel | null
  setPanel: (p: DockPanel | null) => void
  renderPanel: (p: DockPanel, anchor: HTMLElement | null, close: () => void) => ReactNode
  onPresent: () => void
  onFullscreen: () => void
  fullscreen: boolean
}) {
  const anchors = useRef(new Map<DockPanel, HTMLButtonElement>())
  const [anchor, setAnchor] = useState<HTMLElement | null>(null)
  useLayoutEffect(() => setAnchor(panel ? (anchors.current.get(panel) ?? null) : null), [panel])
  const close = useCallback(() => setPanel(null), [setPanel])
  return (
    <>
      <nav
        aria-label="Dock"
        className={cn(
          'absolute bottom-3 left-1/2 z-[9500] flex max-w-[calc(100%-1.5rem)] -translate-x-1/2 animate-slide-up items-center gap-0.5 overflow-x-auto rounded-2xl p-1.5 pt-2 [scrollbar-width:none]',
          'border border-white/50 bg-white/85 shadow-2xl backdrop-blur-xl',
        )}
      >
        {DOCK_TYPES.map((type) => (
          <DockButton key={type} icon={WIDGETS.get(type)!.icon} label={`Add ${type}`} onClick={() => onAdd(type)} />
        ))}
        <Divider />
        <DockButton icon={Plus} label="More widgets" hint="N" highlight onClick={onMore} />
        <Divider />
        {PANELS.map((p) => (
          <DockButton
            key={p.id}
            ref={(el: HTMLButtonElement | null) => {
              if (el) anchors.current.set(p.id, el)
            }}
            icon={p.icon}
            label={p.label}
            hint={p.key}
            pressed={panel === p.id}
            onClick={() => setPanel(panel === p.id ? null : p.id)}
          />
        ))}
        <a
          href={STATIQ.url}
          target={STATIQ.target}
          aria-label={STATIQ.name}
          className="group relative grid size-11 shrink-0 place-items-center rounded-xl text-sky-600 transition-all duration-200 hover:-translate-y-1 hover:bg-white"
        >
          <FileText size={20} aria-hidden className="transition-transform group-hover:scale-110" />
          <span className="pointer-events-none absolute -top-8 rounded-md bg-slate-800 px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap text-white opacity-0 transition-opacity group-hover:opacity-100">
            {STATIQ.name}
          </span>
        </a>
        <Divider />
        <DockButton icon={MonitorPlay} label="Present" hint="H" onClick={onPresent} />
        <DockButton
          icon={fullscreen ? Shrink : Expand}
          label={fullscreen ? 'Exit full screen' : 'Full screen'}
          hint="F"
          onClick={onFullscreen}
        />
      </nav>
      {panel && anchor && renderPanel(panel, anchor, close)}
    </>
  )
}

const SHORTCUTS: [string, string][] = [
  ['N', 'Add a widget'],
  ['D', 'Draw on the board'],
  ['[  ]', 'Previous / next workspace'],
  ['G', 'Games'],
  ['L', 'Activities'],
  ['T', 'Textbooks'],
  ['B', 'Background'],
  ['H', 'Hide or show the controls (projector mode)'],
  ['F', 'Full screen'],
  ['Esc', 'Leave focus mode or projector mode'],
  ['Double-click a title bar', 'Focus that widget'],
  ['Arrow keys (title bar selected)', 'Move a widget; Shift+arrows resizes, Alt moves 1 px'],
  ['?', 'This list'],
]

export function ShortcutsDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Dialog open={open} onClose={onClose} title="Keyboard shortcuts" size="sm">
      <dl className="divide-y divide-line">
        {SHORTCUTS.map(([k, v]) => (
          <div key={k} className="flex items-center justify-between gap-4 py-2 text-sm">
            <dt>
              <kbd className="rounded-md border border-line bg-canvas px-1.5 py-0.5 font-mono text-xs font-semibold">{k}</kbd>
            </dt>
            <dd className="text-right text-ink-soft">{v}</dd>
          </div>
        ))}
      </dl>
    </Dialog>
  )
}

export function PresentExit({ onExit, onShortcuts }: { onExit: () => void; onShortcuts: () => void }) {
  return (
    <div className="absolute right-3 bottom-3 z-[9500] flex gap-1 opacity-30 transition-opacity hover:opacity-100 focus-within:opacity-100">
      <button type="button" className={cn(glass, glassButton, 'size-10')} aria-label="Keyboard shortcuts" onClick={onShortcuts}>
        <Keyboard size={18} aria-hidden />
      </button>
      <button type="button" className={cn(glass, glassButton, 'h-10 px-3 text-sm font-semibold')} onClick={onExit}>
        Show controls
      </button>
    </div>
  )
}
