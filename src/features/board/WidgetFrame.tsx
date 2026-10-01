import { memo, useCallback, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent as ReactPointerEvent } from 'react'
import {
  ArrowDownToLine,
  ArrowUpToLine,
  Copy,
  Lock,
  LockOpen,
  Maximize2,
  Minimize2,
  MoreHorizontal,
  Scaling,
  Settings2,
  X,
} from 'lucide-react'
import { Menu } from '@/components/ui'
import type { Widget } from '@/data/schema'
import { cn } from '@/lib/cn'
import { GRID, META_BY_TYPE, placeOnBoard, snap } from './model'
import { WIDGETS, widgetConfig } from './registry'
import { WidgetBoundary } from './WidgetBoundary'

const HEADER = 32

interface Rect {
  x: number
  y: number
  width: number
  height: number
}

export interface FrameActions {
  update: (id: string, changes: Partial<Widget>) => void
  updateConfig: (id: string, changes: Record<string, unknown>) => void
  remove: (id: string) => void
  toFront: (id: string) => void
  toBack: (id: string) => void
  duplicate: (id: string) => void
  focus: (id: string | null) => void
}

interface Props {
  widget: Widget
  board: { width: number; height: number }
  snapOn: boolean
  focused: boolean
  zIndex: number
  actions: FrameActions
  /** Hide the frame's chrome (projector mode). */
  bare: boolean
}

type Gesture = { kind: 'move' | 'resize'; px: number; py: number; start: Rect; edges: string } | null

function WidgetFrameImpl({ widget, board, snapOn, focused, zIndex, actions, bare }: Props) {
  const def = WIDGETS.get(widget.type)
  const meta = META_BY_TYPE.get(widget.type)
  const [settings, setSettings] = useState(false)
  const gesture = useRef<Gesture>(null)
  const { id, locked } = widget

  const update = useCallback((changes: Record<string, unknown>) => actions.updateConfig(id, changes), [actions, id])
  const requestResize = useCallback(
    (size: { width?: number; height?: number }) =>
      actions.update(id, {
        ...(size.width ? { width: Math.min(size.width, board.width) } : {}),
        ...(size.height ? { height: Math.min(size.height + HEADER, board.height) } : {}),
      }),
    [actions, id, board.width, board.height],
  )
  const remove = useCallback(() => actions.remove(id), [actions, id])
  const config = useMemo(() => widgetConfig(widget.type, widget.config), [widget.type, widget.config])
  const rect = placeOnBoard(widget, board)

  if (!def || !meta) return null
  const Body = def.component

  /* ---------------------------------------------- full-screen overlay */
  if (meta.overlay)
    return (
      <div className="absolute inset-0" style={{ zIndex }} onPointerDownCapture={() => actions.toFront(id)}>
        <WidgetBoundary type={widget.type} remove={remove}>
          <Body
            id={id}
            config={config}
            update={update}
            settings={false}
            closeSettings={() => {}}
            focused={false}
            width={board.width}
            height={board.height}
            requestResize={requestResize}
            locked={locked}
            remove={remove}
          />
        </WidgetBoundary>
      </div>
    )

  /* ---------------------------------------------------- normal frame */
  // Settings forms need room: small widgets grow while their settings are open (not saved).
  const box: Rect = focused ? focusRect(rect, board) : settings ? settingsRect(rect, board) : rect
  const bodyW = box.width
  const bodyH = box.height - (bare ? 0 : HEADER)
  // Focus mode enlarges every widget: its normal-size layout is scaled up.
  const designW = meta.scaleContent ? meta.w : focused ? rect.width : bodyW
  const designH = meta.scaleContent ? meta.h - HEADER : focused ? rect.height - (bare ? 0 : HEADER) : bodyH
  const scaled = (meta.scaleContent || focused) && !settings
  const scale = scaled ? Math.min(bodyW / designW, bodyH / designH) : 1

  const begin = (e: ReactPointerEvent, kind: 'move' | 'resize', edges = '') => {
    if (locked || focused || e.button !== 0) return
    e.preventDefault()
    e.stopPropagation()
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    gesture.current = { kind, px: e.clientX, py: e.clientY, start: rect, edges }
  }
  const moveGesture = (e: ReactPointerEvent) => {
    const g = gesture.current
    if (!g) return
    const dx = e.clientX - g.px
    const dy = e.clientY - g.py
    if (g.kind === 'move') {
      const x = Math.max(-g.start.width + 80, Math.min(board.width - 80, snap(g.start.x + dx, snapOn)))
      const y = Math.max(0, Math.min(board.height - HEADER, snap(g.start.y + dy, snapOn)))
      actions.update(id, { x, y })
    } else {
      const changes: Partial<Rect> = {}
      if (g.edges.includes('e')) changes.width = Math.max(meta.minW, snap(g.start.width + dx, snapOn))
      if (g.edges.includes('s')) changes.height = Math.max(meta.minH, snap(g.start.height + dy, snapOn))
      actions.update(id, changes)
    }
  }
  const endGesture = () => {
    gesture.current = null
  }

  const onKeyDown = (e: KeyboardEvent) => {
    if (locked || focused) return
    const step = e.altKey ? 1 : GRID
    const dir = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[e.key]
    if (!dir) return
    e.preventDefault()
    if (e.shiftKey)
      actions.update(id, {
        width: Math.max(meta.minW, rect.width + dir[0] * step),
        height: Math.max(meta.minH, rect.height + dir[1] * step),
      })
    else actions.update(id, { x: Math.max(0, rect.x + dir[0] * step), y: Math.max(0, rect.y + dir[1] * step) })
  }

  const Icon = def.icon
  const control = 'grid size-7 place-items-center rounded-lg text-ink-soft transition-colors hover:bg-ink/8 hover:text-ink'

  return (
    <section
      aria-label={widget.type}
      data-widget={widget.type}
      className={cn(
        'group absolute flex flex-col rounded-2xl bg-surface text-ink shadow-pop ring-1 ring-black/5',
        focused && 'transition-all duration-200',
      )}
      style={{ left: box.x, top: box.y, width: box.width, height: box.height, zIndex }}
      onPointerDownCapture={() => actions.toFront(id)}
    >
      {!bare && (
        <header
          tabIndex={0}
          aria-label={`${widget.type} — ${locked ? 'locked' : 'drag to move, arrow keys to move, Shift+arrows to resize'}`}
          onPointerDown={(e) => begin(e, 'move')}
          onPointerMove={moveGesture}
          onPointerUp={endGesture}
          onPointerCancel={endGesture}
          onDoubleClick={(e) => {
            if ((e.target as HTMLElement).closest('button')) return
            actions.focus(focused ? null : id)
          }}
          onKeyDown={onKeyDown}
          className={cn(
            'flex h-8 shrink-0 touch-none items-center gap-1 rounded-t-2xl border-b border-black/[0.05] pr-1 pl-2.5 select-none',
            locked ? 'bg-amber-50/80' : 'bg-slate-50/90',
            locked || focused ? 'cursor-default' : 'cursor-grab active:cursor-grabbing',
          )}
        >
          <Icon size={14} aria-hidden className="shrink-0 text-ink-faint" />
          <span className="min-w-0 flex-1 truncate text-xs font-semibold text-ink-soft">{widget.type}</span>
          {locked && <Lock size={12} aria-label="Locked" className="shrink-0 text-ink-faint" />}
          <div
            className="flex items-center transition-opacity [@media(hover:hover)]:opacity-0 group-focus-within:opacity-100 group-hover:opacity-100"
            onPointerDown={(e) => e.stopPropagation()}
          >
            {!def.noSettings && (
              <button
                type="button"
                className={cn(control, settings && 'bg-accent-soft text-accent-strong')}
                aria-label={settings ? 'Close settings' : `${widget.type} settings`}
                aria-pressed={settings}
                title="Settings"
                onClick={() => setSettings((s) => !s)}
              >
                <Settings2 size={15} aria-hidden />
              </button>
            )}
            <button
              type="button"
              className={control}
              aria-label={focused ? 'Exit focus' : 'Focus'}
              title={focused ? 'Exit focus (Esc)' : 'Focus'}
              onClick={() => actions.focus(focused ? null : id)}
            >
              {focused ? <Minimize2 size={15} aria-hidden /> : <Maximize2 size={15} aria-hidden />}
            </button>
            <Menu
              trigger={(p) => (
                <button type="button" className={control} aria-label={`More actions for ${widget.type}`} title="More" {...p}>
                  <MoreHorizontal size={15} aria-hidden />
                </button>
              )}
              items={[
                {
                  label: locked ? 'Unlock' : 'Lock in place',
                  icon: locked ? LockOpen : Lock,
                  onSelect: () => actions.update(id, { locked: !locked }),
                },
                { label: 'Bring to front', icon: ArrowUpToLine, onSelect: () => actions.toFront(id) },
                { label: 'Send to back', icon: ArrowDownToLine, onSelect: () => actions.toBack(id) },
                { label: 'Duplicate', icon: Copy, onSelect: () => actions.duplicate(id) },
                {
                  label: 'Reset size',
                  icon: Scaling,
                  disabled: locked,
                  onSelect: () => actions.update(id, { width: meta.w, height: meta.h }),
                },
              ]}
            />
            <button
              type="button"
              className={cn(control, 'hover:bg-danger/10 hover:text-danger')}
              aria-label={`Close ${widget.type}`}
              title="Close"
              onClick={remove}
            >
              <X size={16} aria-hidden />
            </button>
          </div>
        </header>
      )}
      <div className={cn('relative min-h-0 flex-1 overflow-hidden', bare ? 'rounded-2xl' : 'rounded-b-2xl')}>
        <div
          className="absolute top-0 left-0"
          style={
            scaled
              ? {
                  width: designW,
                  height: designH,
                  transform: `translate(${(bodyW - designW * scale) / 2}px, ${(bodyH - designH * scale) / 2}px) scale(${scale})`,
                  transformOrigin: '0 0',
                }
              : { width: bodyW, height: bodyH }
          }
        >
          <WidgetBoundary type={widget.type} remove={remove}>
            <Body
              id={id}
              config={config}
              update={update}
              settings={settings}
              closeSettings={() => setSettings(false)}
              focused={focused}
              width={scaled ? designW : bodyW}
              height={scaled ? designH : bodyH}
              requestResize={requestResize}
              locked={locked}
              remove={remove}
            />
          </WidgetBoundary>
        </div>
      </div>
      {!locked && !focused && !bare && (
        <>
          <div
            aria-hidden
            className="absolute top-3 -right-1.5 bottom-3 w-3 cursor-ew-resize touch-none"
            onPointerDown={(e) => begin(e, 'resize', 'e')}
            onPointerMove={moveGesture}
            onPointerUp={endGesture}
            onPointerCancel={endGesture}
          />
          <div
            aria-hidden
            className="absolute right-3 -bottom-1.5 left-3 h-3 cursor-ns-resize touch-none"
            onPointerDown={(e) => begin(e, 'resize', 's')}
            onPointerMove={moveGesture}
            onPointerUp={endGesture}
            onPointerCancel={endGesture}
          />
          <div
            data-resize-handle
            aria-hidden
            className="absolute -right-1 -bottom-1 grid size-6 cursor-nwse-resize touch-none place-items-end p-1"
            onPointerDown={(e) => begin(e, 'resize', 'es')}
            onPointerMove={moveGesture}
            onPointerUp={endGesture}
            onPointerCancel={endGesture}
          >
            <span className="block size-2.5 rounded-br-md border-r-2 border-b-2 border-ink/25 transition-colors group-hover:border-accent" />
          </div>
        </>
      )}
    </section>
  )
}

function settingsRect(r: Rect, board: { width: number; height: number }): Rect {
  const width = Math.min(Math.max(r.width, 300), board.width)
  const height = Math.min(Math.max(r.height, 400), board.height)
  return { x: Math.max(0, Math.min(r.x, board.width - width)), y: Math.max(0, Math.min(r.y, board.height - height)), width, height }
}

/** Enlarged, centred box for focus mode (keeps the widget's shape). */
function focusRect(r: Rect, board: { width: number; height: number }): Rect {
  const s = Math.min((board.width * 0.9) / r.width, (board.height * 0.84) / r.height)
  const width = Math.round(r.width * s)
  const height = Math.round(r.height * s)
  return { x: Math.round((board.width - width) / 2), y: Math.round((board.height - height) / 2), width, height }
}

export const WidgetFrame = memo(WidgetFrameImpl)
