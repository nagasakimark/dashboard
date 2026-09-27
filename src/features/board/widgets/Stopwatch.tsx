import { useEffect, useState } from 'react'
import { Flag, Pause, Play, RotateCcw } from 'lucide-react'
import { Button, Switch } from '@/components/ui'
import type { WidgetProps } from '../types'
import type { StopwatchConfig } from './configs'
import { SettingsView } from './controls'
import { formatStopwatch } from './format'

export default function Stopwatch({ config, update, settings, closeSettings }: WidgetProps<StopwatchConfig>) {
  const running = config.startedAt !== null
  const [now, setNow] = useState(() => Date.now())
  const elapsed = config.elapsed + (running ? now - config.startedAt! : 0)

  useEffect(() => {
    if (!running) return
    const id = setInterval(() => setNow(Date.now()), config.showMs ? 40 : 250)
    return () => clearInterval(id)
  }, [running, config.showMs])

  if (settings)
    return (
      <SettingsView onDone={closeSettings}>
        <Switch label="Show hundredths of a second" checked={config.showMs} onChange={(showMs) => update({ showMs })} />
      </SettingsView>
    )

  const start = () => {
    const t = Date.now()
    setNow(t)
    update({ startedAt: t })
  }
  const pause = () => update({ startedAt: null, elapsed })
  const laps = config.laps.map((t, i) => ({ n: i + 1, split: t - (config.laps[i - 1] ?? 0) })).reverse()

  return (
    <div className="flex h-full flex-col items-center gap-2 p-3">
      <div className="grid flex-1 place-items-center" role="timer">
        <span className="text-[40px] font-bold tracking-tight tabular-nums">{formatStopwatch(elapsed, config.showMs)}</span>
      </div>
      <div className="flex gap-2">
        {running ? (
          <Button size="sm" icon={Pause} onClick={pause}>
            Pause
          </Button>
        ) : (
          <Button size="sm" variant="primary" icon={Play} onClick={start}>
            {elapsed ? 'Resume' : 'Start'}
          </Button>
        )}
        {running ? (
          <Button size="sm" icon={Flag} onClick={() => update({ laps: [...config.laps, elapsed] })}>
            Lap
          </Button>
        ) : (
          <Button size="sm" icon={RotateCcw} disabled={!elapsed} onClick={() => update({ startedAt: null, elapsed: 0, laps: [] })}>
            Reset
          </Button>
        )}
      </div>
      {laps.length > 0 && (
        <ol className="h-14 w-full overflow-y-auto rounded-lg bg-canvas px-2 py-1 text-xs tabular-nums" aria-label="Laps">
          {laps.map((l) => (
            <li key={l.n} className="flex justify-between">
              <span className="text-ink-soft">Lap {l.n}</span>
              <span className="font-semibold">{formatStopwatch(l.split, config.showMs)}</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}
