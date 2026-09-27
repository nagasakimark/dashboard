import { format } from 'date-fns'
import {
  ArrowLeft,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Expand,
  Gamepad2,
  Image,
  Keyboard,
  Link2,
  Layers,
  MonitorPlay,
  Plus,
  Settings,
  Shrink,
} from 'lucide-react'
import { Link } from 'react-router'
import { Dialog, Menu } from '@/components/ui'
import type { Workspace } from '@/data/schema'
import { cn } from '@/lib/cn'
import { useNow } from '@/lib/useNow'
import { DOCK_TYPES } from './model'
import { WIDGETS } from './registry'

const glass = 'bg-black/30 text-white shadow-lg ring-1 ring-white/15 backdrop-blur-md'
const glassButton =
  'inline-flex items-center justify-center gap-1.5 rounded-xl transition-colors hover:bg-white/15 active:bg-white/25 disabled:opacity-40'

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
      <time className="hidden px-2 text-lg font-bold tabular-nums sm:block" dateTime={now.toISOString()}>
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
            <span className="text-xs font-medium text-white/70 tabular-nums">
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

export function Dock({
  onAdd,
  onMore,
  onLinks,
  onBackground,
  onPresent,
  onFullscreen,
  fullscreen,
}: {
  onAdd: (type: string) => void
  onMore: () => void
  onLinks: () => void
  onBackground: () => void
  onPresent: () => void
  onFullscreen: () => void
  fullscreen: boolean
}) {
  const item = cn(glassButton, 'h-12 min-w-12 flex-col gap-0.5 px-2 text-[10px] font-semibold')
  return (
    <nav
      aria-label="Dock"
      className={cn(
        'absolute bottom-3 left-1/2 z-[9500] flex max-w-[calc(100%-1.5rem)] -translate-x-1/2 animate-slide-up items-center gap-0.5 overflow-x-auto rounded-2xl p-1.5 [scrollbar-width:none]',
        glass,
      )}
    >
      {DOCK_TYPES.map((type) => {
        const Icon = WIDGETS.get(type)!.icon
        return (
          <button key={type} type="button" className={item} onClick={() => onAdd(type)} aria-label={`Add ${type}`} title={`Add ${type}`}>
            <Icon size={20} aria-hidden />
            <span className="hidden whitespace-nowrap lg:block">{type}</span>
          </button>
        )
      })}
      <button type="button" className={cn(item, 'bg-white/15')} onClick={onMore} title="More widgets (N)">
        <Plus size={20} aria-hidden />
        <span className="hidden whitespace-nowrap lg:block">More widgets</span>
        <span className="sr-only lg:hidden">More widgets</span>
      </button>
      <span className="mx-1 h-8 w-px shrink-0 bg-white/20" aria-hidden />
      <button type="button" className={item} onClick={onLinks} title="Activities, bookmarks and textbooks (L)">
        <Link2 size={20} aria-hidden />
        <span className="hidden lg:block">Links</span>
        <span className="sr-only lg:hidden">Links</span>
      </button>
      <Link to="/games" className={item} title="Vocabulary games and JHS mode (G)">
        <Gamepad2 size={20} aria-hidden />
        <span className="hidden lg:block">Games</span>
        <span className="sr-only lg:hidden">Games</span>
      </Link>
      <button type="button" className={item} onClick={onBackground} title="Background (B)">
        <Image size={20} aria-hidden />
        <span className="hidden lg:block">Background</span>
        <span className="sr-only lg:hidden">Background</span>
      </button>
      <button type="button" className={item} onClick={onPresent} title="Hide controls (H)">
        <MonitorPlay size={20} aria-hidden />
        <span className="hidden lg:block">Present</span>
        <span className="sr-only lg:hidden">Present</span>
      </button>
      <button type="button" className={item} onClick={onFullscreen} title="Full screen (F)">
        {fullscreen ? <Shrink size={20} aria-hidden /> : <Expand size={20} aria-hidden />}
        <span className="hidden whitespace-nowrap lg:block">{fullscreen ? 'Exit full' : 'Full screen'}</span>
        <span className="sr-only lg:hidden">{fullscreen ? 'Exit full screen' : 'Full screen'}</span>
      </button>
    </nav>
  )
}

const SHORTCUTS: [string, string][] = [
  ['N', 'Add a widget'],
  ['D', 'Draw on the board'],
  ['[  ]', 'Previous / next workspace'],
  ['G', 'Games'],
  ['L', 'Activities, bookmarks and textbooks'],
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
