import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { Download, Eraser, Hand, Pen, Redo2, Square, Trash2, Undo2, X } from 'lucide-react'
import { cn } from '@/lib/cn'
import type { WidgetProps } from '../types'
import type { DrawingConfig, Stroke } from './configs'

const COLORS = ['#111827', '#ef4444', '#3b82f6', '#22c55e', '#f59e0b', '#a855f7', '#ffffff']
const SIZES = [3, 6, 12, 24]

function paint(ctx: CanvasRenderingContext2D, s: Stroke) {
  const p = s.points
  if (p.length < 2) return
  ctx.globalCompositeOperation = s.erase ? 'destination-out' : 'source-over'
  ctx.strokeStyle = s.color
  ctx.fillStyle = s.color
  ctx.lineWidth = s.size
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  if (p.length === 2) {
    ctx.beginPath()
    ctx.arc(p[0], p[1], s.size / 2, 0, Math.PI * 2)
    ctx.fill()
    return
  }
  ctx.beginPath()
  ctx.moveTo(p[0], p[1])
  // Smooth with quadratic curves through midpoints.
  for (let i = 2; i < p.length - 2; i += 2) ctx.quadraticCurveTo(p[i], p[i + 1], (p[i] + p[i + 2]) / 2, (p[i + 1] + p[i + 3]) / 2)
  ctx.lineTo(p[p.length - 2], p[p.length - 1])
  ctx.stroke()
}

/**
 * Transparent drawing layer over the whole board. The eraser really erases
 * (the old one painted white), and "Use widgets" lets clicks through to the
 * widgets underneath without closing the drawing.
 */
export default function Drawing({ config, update, width, height, remove }: WidgetProps<DrawingConfig>) {
  const canvas = useRef<HTMLCanvasElement>(null)
  const active = useRef<Stroke | null>(null)
  const [erase, setErase] = useState(false)
  const [passThrough, setPassThrough] = useState(false)
  const [redo, setRedo] = useState<Stroke[]>([])
  const strokes = config.strokes

  const redraw = useCallback(() => {
    const c = canvas.current
    const ctx = c?.getContext('2d')
    if (!c || !ctx) return
    const dpr = window.devicePixelRatio || 1
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, c.width, c.height)
    for (const s of strokes) paint(ctx, s)
    if (active.current) paint(ctx, active.current)
  }, [strokes])

  useEffect(() => {
    const c = canvas.current
    if (!c) return
    const dpr = window.devicePixelRatio || 1
    c.width = Math.round(width * dpr)
    c.height = Math.round(height * dpr)
    redraw()
  }, [width, height, redraw])

  const point = (e: ReactPointerEvent) => {
    const r = canvas.current!.getBoundingClientRect()
    return [Math.round(e.clientX - r.left), Math.round(e.clientY - r.top)]
  }
  const down = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    if (e.button !== 0) return
    e.currentTarget.setPointerCapture(e.pointerId)
    active.current = { color: config.color, size: erase ? config.size * 3 : config.size, erase, points: point(e) }
    redraw()
  }
  const move = (e: ReactPointerEvent) => {
    if (!active.current) return
    const events = 'getCoalescedEvents' in e.nativeEvent ? e.nativeEvent.getCoalescedEvents() : []
    for (const ev of events.length ? events : [e.nativeEvent]) {
      const r = canvas.current!.getBoundingClientRect()
      active.current.points.push(Math.round(ev.clientX - r.left), Math.round(ev.clientY - r.top))
    }
    redraw()
  }
  const up = () => {
    const s = active.current
    active.current = null
    if (!s) return
    setRedo([])
    update({ strokes: [...strokes, s] })
  }

  const download = () => {
    const c = canvas.current
    if (!c) return
    const out = document.createElement('canvas')
    out.width = c.width
    out.height = c.height
    const ctx = out.getContext('2d')!
    if (config.white) {
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, out.width, out.height)
    }
    ctx.drawImage(c, 0, 0)
    const a = Object.assign(document.createElement('a'), {
      href: out.toDataURL('image/png'),
      download: `drawing-${new Date().toISOString().slice(0, 10)}.png`,
    })
    a.click()
  }

  const tool = (on: boolean) =>
    cn(
      'grid size-9 place-items-center rounded-xl transition-colors',
      on ? 'bg-accent text-white' : 'text-ink-soft hover:bg-ink/6 hover:text-ink',
    )

  return (
    <div className={cn('absolute inset-0', config.white && 'bg-white')}>
      <canvas
        ref={canvas}
        aria-label="Drawing canvas"
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={up}
        className={cn(
          'absolute inset-0 size-full touch-none',
          passThrough ? 'pointer-events-none' : erase ? 'cursor-cell' : 'cursor-crosshair',
        )}
        style={{ width, height }}
      />
      <div
        role="toolbar"
        aria-label="Drawing tools"
        className="absolute top-16 left-1/2 lg:top-3 flex max-w-[calc(100%-1rem)] -translate-x-1/2 flex-wrap items-center justify-center gap-1 rounded-2xl border border-line bg-surface/95 p-1.5 shadow-pop backdrop-blur"
      >
        <button
          type="button"
          className={tool(!erase && !passThrough)}
          aria-pressed={!erase && !passThrough}
          aria-label="Pen"
          title="Pen"
          onClick={() => {
            setErase(false)
            setPassThrough(false)
          }}
        >
          <Pen size={17} aria-hidden />
        </button>
        <button
          type="button"
          className={tool(erase && !passThrough)}
          aria-pressed={erase && !passThrough}
          aria-label="Eraser"
          title="Eraser"
          onClick={() => {
            setErase(true)
            setPassThrough(false)
          }}
        >
          <Eraser size={17} aria-hidden />
        </button>
        <button
          type="button"
          className={tool(passThrough)}
          aria-pressed={passThrough}
          aria-label="Use widgets"
          title="Use widgets (pause drawing)"
          onClick={() => setPassThrough((p) => !p)}
        >
          <Hand size={17} aria-hidden />
        </button>
        <span className="mx-1 h-6 w-px bg-line" aria-hidden />
        {COLORS.map((c) => (
          <button
            key={c}
            type="button"
            aria-label={`Colour ${c}`}
            aria-pressed={config.color === c}
            onClick={() => {
              update({ color: c })
              setErase(false)
              setPassThrough(false)
            }}
            className={cn(
              'size-7 rounded-full border border-black/15 ring-offset-2 transition-transform hover:scale-110',
              config.color === c && !erase && 'ring-2 ring-accent',
            )}
            style={{ backgroundColor: c }}
          />
        ))}
        <span className="mx-1 h-6 w-px bg-line" aria-hidden />
        {SIZES.map((s) => (
          <button
            key={s}
            type="button"
            aria-label={`Brush size ${s}`}
            aria-pressed={config.size === s}
            onClick={() => update({ size: s })}
            className={tool(config.size === s)}
          >
            <span className="rounded-full bg-current" style={{ width: Math.min(18, s), height: Math.min(18, s) }} />
          </button>
        ))}
        <span className="mx-1 h-6 w-px bg-line" aria-hidden />
        <button
          type="button"
          className={tool(config.white)}
          aria-pressed={config.white}
          aria-label="White background"
          title="White background"
          onClick={() => update({ white: !config.white })}
        >
          <Square size={17} aria-hidden />
        </button>
        <button
          type="button"
          className={tool(false)}
          aria-label="Undo"
          title="Undo"
          disabled={!strokes.length}
          onClick={() => {
            setRedo((r) => [...r, strokes[strokes.length - 1]])
            update({ strokes: strokes.slice(0, -1) })
          }}
        >
          <Undo2 size={17} aria-hidden />
        </button>
        <button
          type="button"
          className={tool(false)}
          aria-label="Redo"
          title="Redo"
          disabled={!redo.length}
          onClick={() => {
            update({ strokes: [...strokes, redo[redo.length - 1]] })
            setRedo((r) => r.slice(0, -1))
          }}
        >
          <Redo2 size={17} aria-hidden />
        </button>
        <button
          type="button"
          className={tool(false)}
          aria-label="Clear drawing"
          title="Clear"
          disabled={!strokes.length}
          onClick={() => {
            setRedo([...strokes].reverse())
            update({ strokes: [] })
          }}
        >
          <Trash2 size={17} aria-hidden />
        </button>
        <button type="button" className={tool(false)} aria-label="Download PNG" title="Download PNG" onClick={download}>
          <Download size={17} aria-hidden />
        </button>
        <span className="mx-1 h-6 w-px bg-line" aria-hidden />
        <button type="button" className={tool(false)} aria-label="Close drawing" title="Close drawing" onClick={remove}>
          <X size={18} aria-hidden />
        </button>
      </div>
    </div>
  )
}
