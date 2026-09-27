import { useEffect, useRef, useState } from 'react'
import { Pause, Play, RotateCcw } from 'lucide-react'
import { Button, Switch } from '@/components/ui'
import { cn } from '@/lib/cn'
import { playAlarm, primeAudio } from '../sound'
import type { WidgetProps } from '../types'
import { ColorPicker, Segmented, Setting, SettingsView, Stepper } from './controls'
import type { TimerConfig } from './configs'
import { formatClock } from './format'

const PRESETS = [1, 3, 5, 10, 15, 30]
const RING = ['#4f46e5', '#0891b2', '#059669', '#d97706', '#dc2626', '#db2777']

export default function Timer({ config, update, settings, closeSettings }: WidgetProps<TimerConfig>) {
  const running = config.endsAt !== null
  const [now, setNow] = useState(() => Date.now())
  const left = running ? Math.max(0, (config.endsAt! - now) / 1000) : config.remaining
  const done = left <= 0
  const rang = useRef(done)

  useEffect(() => {
    if (!running) return
    const id = setInterval(() => setNow(Date.now()), 200)
    return () => clearInterval(id)
  }, [running])

  useEffect(() => {
    if (running && done && !rang.current) {
      rang.current = true
      // No alarm for a timer that ran out while the board was closed.
      if (config.alarm && Date.now() - config.endsAt! < 5000) playAlarm()
      update({ endsAt: null, remaining: 0 })
    }
    if (!done) rang.current = false
  }, [running, done, config.alarm, config.endsAt, update])

  const setLength = (seconds: number) => update({ duration: seconds, remaining: seconds, endsAt: null })

  if (settings) {
    const mins = Math.floor(config.duration / 60)
    const secs = config.duration % 60
    return (
      <SettingsView onDone={closeSettings}>
        <Setting label="Presets">
          <Segmented
            label="Preset length"
            value={config.duration % 60 === 0 && PRESETS.includes(mins) ? mins : -1}
            options={PRESETS.map((m) => ({ value: m, label: `${m}m` }))}
            onChange={(m) => setLength(m * 60)}
          />
        </Setting>
        <Setting label="Minutes">
          <Stepper label="Minutes" value={mins} min={0} max={180} onChange={(m) => setLength(Math.max(1, m * 60 + secs))} />
        </Setting>
        <Setting label="Seconds">
          <Stepper label="Seconds" value={secs} min={0} max={55} step={5} onChange={(s) => setLength(Math.max(1, mins * 60 + s))} />
        </Setting>
        <Setting label="Ring colour">
          <ColorPicker label="Ring colour" colors={RING} value={config.color} onChange={(color) => update({ color })} />
        </Setting>
        <Switch label="Play alarm when done" checked={config.alarm} onChange={(alarm) => update({ alarm })} />
      </SettingsView>
    )
  }

  const total = Math.max(1, config.duration)
  const fraction = Math.max(0, Math.min(1, left / total))
  const r = 70
  const c = 2 * Math.PI * r

  const start = () => {
    primeAudio()
    const from = done ? config.duration : left
    setNow(Date.now())
    update({ endsAt: Date.now() + from * 1000, remaining: from })
  }

  return (
    <div className={cn('flex h-full flex-col items-center justify-center gap-2 p-3 transition-colors', done && 'bg-danger/10')}>
      <div className="relative size-36">
        <svg viewBox="0 0 160 160" className="size-full -rotate-90" aria-hidden>
          <circle cx="80" cy="80" r={r} fill="none" stroke="currentColor" strokeWidth="10" className="text-ink/8" />
          <circle
            cx="80"
            cy="80"
            r={r}
            fill="none"
            stroke={done ? 'var(--color-danger)' : config.color}
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={c}
            strokeDashoffset={c * (1 - fraction)}
            style={{ transition: running ? 'stroke-dashoffset 200ms linear' : undefined }}
          />
        </svg>
        <div className="absolute inset-0 grid place-items-center text-center" role="timer" aria-live="off">
          {done ? (
            <span className="animate-pulse text-xl font-black tracking-tight text-danger">TIME’S UP</span>
          ) : (
            <span className="text-4xl font-bold tracking-tight tabular-nums">{formatClock(Math.ceil(left))}</span>
          )}
        </div>
      </div>
      <div className="flex gap-2">
        {running ? (
          <Button size="sm" icon={Pause} onClick={() => update({ endsAt: null, remaining: left })}>
            Pause
          </Button>
        ) : (
          <Button size="sm" variant="primary" icon={Play} onClick={start}>
            {done ? 'Restart' : left < config.duration ? 'Resume' : 'Start'}
          </Button>
        )}
        <Button size="sm" icon={RotateCcw} onClick={() => update({ endsAt: null, remaining: config.duration })}>
          Reset
        </Button>
      </div>
    </div>
  )
}
