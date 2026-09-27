import { lazy, Suspense, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router'
import { BookOpen, Bookmark, Gamepad2, Image, Puzzle, type LucideIcon } from 'lucide-react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Spinner, useFeedback } from '@/components/ui'
import { db } from '@/data/db'
import type { Widget } from '@/data/schema'
import { useSettings } from '@/data/settings'
import { useSchools } from '@/features/schedule/hooks'
import { useNow } from '@/lib/useNow'
import { addWorkspace } from './actions'
import { AddWidgetDialog } from './AddWidgetDialog'
import { resolveBackground } from './backgrounds'
import { Dock, PresentExit, ShortcutsDialog, TopLeft, WorkspaceSwitcher, type DockPanel } from './BoardChrome'
import { BoardSettingsDialog } from './BoardSettingsDialog'
import { BoardContext, type BoardContextValue, type BoardSettingsTab } from './context'
import { DockPopover } from './DockPopover'
import type { GameTarget } from './GamesLauncher'
import { GameWindow } from './GameWindow'
import { createWidget, META_BY_TYPE, widgetId } from './model'
import { WIDGETS } from './registry'
import { emptySource } from './rosters'
import { useWidgets, useWorkspaces } from './useBoard'
import { WidgetFrame, type FrameActions } from './WidgetFrame'

const DockPanelContent = lazy(() => import('./DockPanelContent'))

const PANEL_META: Record<DockPanel, { title: string; icon: LucideIcon; className?: string }> = {
  textbooks: { title: 'Textbooks', icon: BookOpen },
  activities: { title: 'Activities', icon: Gamepad2, className: 'w-[26rem]' },
  bookmarks: { title: 'Bookmarks', icon: Bookmark, className: 'w-[26rem]' },
  games: { title: 'Games', icon: Puzzle },
  background: { title: 'Background', icon: Image, className: 'w-[26rem]' },
}

/** Game-window search params, cleared when it closes. */
const PLAY_PARAMS = ['play', 'set', 'mode', 'prev', 'group', 'book', 'view']

/** Types whose names come from a class list; new ones start on the last class used. */
const NAME_WIDGETS = new Set(['Random Name', 'Group Maker'])

function useElementSize() {
  const ref = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState({ width: 0, height: 0 })
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const measure = () =>
      setSize((s) => (s.width === el.clientWidth && s.height === el.clientHeight ? s : { width: el.clientWidth, height: el.clientHeight }))
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  return [ref, size] as const
}

const isTyping = (t: EventTarget | null) =>
  t instanceof HTMLElement && (t.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(t.tagName) || !!t.closest('dialog[open]'))

/** Classroom board (full screen). */
export default function BoardPage() {
  const { toast } = useFeedback()
  const [params, setParams] = useSearchParams()
  const play = params.get('play') === 'jhs' ? 'jhs' : params.get('play') === 'games' ? 'games' : null
  const { settings, setSetting } = useSettings()
  const { workspaces, active, select, ready } = useWorkspaces()
  const { widgets, change, get, update, updateConfig, remove, toFront, toBack } = useWidgets(active)
  const rosters = useLiveQuery(() => db.rosters.orderBy('name').toArray(), [])
  const schools = useSchools()
  const now = useNow(60_000)
  const [boardRef, boardSize] = useElementSize()
  const [focusId, setFocusId] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  const [settingsTab, setSettingsTab] = useState<BoardSettingsTab | null>(null)
  const [shortcuts, setShortcuts] = useState(false)
  const [panel, setPanel] = useState<DockPanel | null>(null)
  const [bare, setBare] = useState(false)
  const [fullscreen, setFullscreen] = useState(false)

  const boardDims = useMemo(() => ({ width: boardSize.width, height: boardSize.height }), [boardSize.width, boardSize.height])

  const addWidget = useCallback(
    (type: string) => {
      const existing = get()
      const drawing = META_BY_TYPE.get(type)?.overlay && existing.find((w) => w.type === type)
      if (drawing) return toFront(drawing.id)
      const w = createWidget(type, existing, boardDims)
      const rosterOk = settings.lastRosterId && rosters?.some((r) => r.id === settings.lastRosterId)
      if (NAME_WIDGETS.has(type) && rosterOk) w.config = { source: emptySource(settings.lastRosterId) }
      change((list) => [...list, w])
    },
    [get, change, toFront, boardDims, settings.lastRosterId, rosters],
  )

  const actions: FrameActions = useMemo(
    () => ({
      update,
      updateConfig,
      toFront,
      toBack,
      focus: setFocusId,
      remove: (id: string) => {
        const w = get().find((x) => x.id === id)
        if (!w) return
        remove(id)
        setFocusId((f) => (f === id ? null : f))
        toast(`Closed ${w.type}`, { action: { label: 'Undo', onClick: () => change((list) => [...list, w]) } })
      },
      duplicate: (id: string) => {
        const w = get().find((x) => x.id === id)
        if (!w) return
        const top = Math.max(0, ...get().map((x) => x.z))
        change((list) => [
          ...list,
          { ...w, id: widgetId(w.type), x: w.x + 40, y: w.y + 40, z: top + 1, locked: false, config: structuredClone(w.config) },
        ])
      },
    }),
    [update, updateConfig, toFront, toBack, remove, get, change, toast],
  )

  // Stacking order as 1…n so the board chrome always stays on top.
  const layers = useMemo(() => new Map([...widgets].sort((a, b) => a.z - b.z).map((w, i) => [w.id, i + 1])), [widgets])

  const toggleFullscreen = useCallback(() => {
    if (document.fullscreenElement) void document.exitFullscreen()
    else void document.documentElement.requestFullscreen?.().catch(() => {})
  }, [])
  useEffect(() => {
    const on = () => setFullscreen(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', on)
    return () => document.removeEventListener('fullscreenchange', on)
  }, [])

  const newWorkspace = useCallback(async () => {
    const ws = await addWorkspace(undefined, [], active?.background ?? 0)
    select(ws.id)
    toast(`Added “${ws.name}”`)
  }, [active?.background, select, toast])

  // Lift toasts above the dock while the board is open.
  useEffect(() => {
    document.body.dataset.board = ''
    return () => {
      delete document.body.dataset.board
    }
  }, [])

  // Keyboard shortcuts.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (focusId) setFocusId(null)
        else if (bare) setBare(false)
        return
      }
      if (e.ctrlKey || e.metaKey || e.altKey || isTyping(e.target) || !workspaces || !active || play) return
      const i = workspaces.findIndex((w) => w.id === active.id)
      const k = e.key.toLowerCase()
      if (k === 'n' || k === '+') setAdding(true)
      else if (k === 'd') addWidget('Drawing')
      else if (k === 'b') setPanel((p) => (p === 'background' ? null : 'background'))
      else if (k === 'g') setPanel((p) => (p === 'games' ? null : 'games'))
      else if (k === 'l') setPanel((p) => (p === 'activities' ? null : 'activities'))
      else if (k === 't') setPanel((p) => (p === 'textbooks' ? null : 'textbooks'))
      else if (k === 'h') setBare((b) => !b)
      else if (k === 'f') toggleFullscreen()
      else if (k === '?') setShortcuts(true)
      else if (k === '[' || k === 'pageup') select(workspaces[(i - 1 + workspaces.length) % workspaces.length].id)
      else if (k === ']' || k === 'pagedown') select(workspaces[(i + 1) % workspaces.length].id)
      else return
      e.preventDefault()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [focusId, bare, workspaces, active, select, addWidget, toggleFullscreen, play])

  // Leave focus mode when the workspace changes.
  const [focusWorkspace, setFocusWorkspace] = useState(active?.id)
  if (focusWorkspace !== active?.id) {
    setFocusWorkspace(active?.id)
    setFocusId(null)
  }

  const openGame = useCallback(
    (t: GameTarget | { play: 'games'; set?: string }) => {
      setPanel(null)
      setParams((p) => {
        PLAY_PARAMS.forEach((k) => p.delete(k))
        p.set('play', t.play)
        if (t.play === 'jhs' && t.book) p.set('book', t.book)
        if (t.play === 'games' && 'group' in t && t.group) p.set('group', t.group)
        if (t.play === 'games' && 'set' in t && t.set) p.set('set', t.set)
        return p
      })
    },
    [setParams],
  )
  const closeGame = useCallback(
    () =>
      setParams((p) => {
        PLAY_PARAMS.forEach((k) => p.delete(k))
        return p
      }),
    [setParams],
  )

  const renderPanel = (p: DockPanel, anchor: HTMLElement | null, close: () => void) => {
    const meta = PANEL_META[p]
    return active ? (
      <DockPopover anchor={anchor} onClose={close} title={meta.title} icon={meta.icon} className={meta.className}>
        <Suspense
          fallback={
            <div className="grid h-24 w-64 place-items-center">
              <Spinner />
            </div>
          }
        >
          <DockPanelContent panel={p} workspace={active} openGame={openGame} />
        </Suspense>
      </DockPopover>
    ) : null
  }

  const context: BoardContextValue = useMemo(
    () => ({
      rosters: rosters ?? [],
      schools: schools ?? [],
      openSettings: setSettingsTab,
      lastRosterId: settings.lastRosterId,
      setLastRosterId: (id: string) => void setSetting('lastRosterId', id),
    }),
    [rosters, schools, settings.lastRosterId, setSetting],
  )

  const bg = resolveBackground(active?.background ?? 0, settings.rotateBackground, now)
  const setWidgets = useCallback((fn: (list: Widget[]) => Widget[]) => change(fn), [change])

  return (
    <BoardContext.Provider value={context}>
      <div className="fixed inset-0 overflow-hidden select-none" style={{ background: bg.css }} data-background={bg.index}>
        <h1 className="sr-only">Classroom board{active ? `: ${active.name}` : ''}</h1>
        <div ref={boardRef} className="absolute inset-0" aria-label="Board" role="region">
          {!ready || !boardSize.width ? (
            <div className="grid h-full place-items-center">
              <Spinner className="border-white/30 border-t-white" />
            </div>
          ) : (
            widgets.map((w) =>
              WIDGETS.has(w.type) ? (
                <WidgetFrame
                  key={w.id}
                  widget={w}
                  board={boardDims}
                  snapOn={settings.snapToGrid}
                  focused={focusId === w.id}
                  zIndex={focusId === w.id ? 9000 : (layers.get(w.id) ?? 1)}
                  actions={actions}
                  bare={bare}
                />
              ) : null,
            )
          )}
          {focusId && (
            <button
              type="button"
              aria-label="Leave focus mode"
              className="absolute inset-0 z-[8000] animate-fade-in cursor-zoom-out bg-slate-950/60 backdrop-blur-[2px]"
              onClick={() => setFocusId(null)}
            />
          )}
        </div>

        {ready && workspaces && active && !bare && (
          <>
            <TopLeft onSettings={() => setSettingsTab('workspaces')} />
            <WorkspaceSwitcher
              workspaces={workspaces}
              active={active}
              select={select}
              add={() => void newWorkspace()}
              manage={() => setSettingsTab('workspaces')}
            />
            {!widgets.length && (
              <div className="pointer-events-none absolute inset-0 grid place-items-center p-6 text-center text-white [text-shadow:0_1px_8px_rgb(0_0_0/0.4)]">
                <div>
                  <p className="text-2xl font-bold">{active.name}</p>
                  <p className="mt-1 text-white/85">Add widgets from the dock below. Press ? for keyboard shortcuts.</p>
                </div>
              </div>
            )}
            <Dock
              onAdd={addWidget}
              onMore={() => setAdding(true)}
              panel={panel}
              setPanel={setPanel}
              renderPanel={renderPanel}
              onPresent={() => setBare(true)}
              onFullscreen={toggleFullscreen}
              fullscreen={fullscreen}
            />
          </>
        )}
        {bare && <PresentExit onExit={() => setBare(false)} onShortcuts={() => setShortcuts(true)} />}
      </div>

      <AddWidgetDialog open={adding} onClose={() => setAdding(false)} onAdd={addWidget} />
      <ShortcutsDialog open={shortcuts} onClose={() => setShortcuts(false)} />
      {play && (
        <GameWindow
          kind={play}
          onClose={closeGame}
          toJhs={() => openGame({ play: 'jhs' })}
          toGames={(set) => openGame({ play: 'games', set })}
        />
      )}
      {workspaces && active && (
        <BoardSettingsDialog
          tab={settingsTab}
          setTab={setSettingsTab}
          workspaces={workspaces}
          active={active}
          widgets={widgets}
          select={select}
          setWidgets={setWidgets}
          rosters={rosters ?? []}
          schools={schools ?? []}
        />
      )}
    </BoardContext.Provider>
  )
}
