import { useEffect, useRef, useState } from 'react'
import { History, RotateCcw, Shuffle } from 'lucide-react'
import { Button, Switch } from '@/components/ui'
import { cn } from '@/lib/cn'
import { useBoardContext } from '../context'
import { sourceNames } from '../rosters'
import { playChime, playTick, primeAudio } from '../sound'
import type { WidgetProps } from '../types'
import type { RandomNameConfig } from './configs'
import { NameSourcePicker, Setting, SettingsView, WidgetEmpty } from './controls'

const ROLLS = 18
const ROLL_MS = 80

export default function RandomName({ config, update, settings, closeSettings }: WidgetProps<RandomNameConfig>) {
  const { rosters, openSettings } = useBoardContext()
  const all = sourceNames(config.source, rosters)
  const pool = config.removeAfterPick ? all.filter((n) => !config.picked.includes(n)) : all
  const [shown, setShown] = useState<string | null>(config.history[0] ?? null)
  const [rolling, setRolling] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const timer = useRef<ReturnType<typeof setInterval>>(undefined)
  useEffect(() => () => clearInterval(timer.current), [])

  if (settings)
    return (
      <SettingsView onDone={closeSettings}>
        <Setting label="Names">
          <NameSourcePicker source={config.source} onChange={(source) => update({ source, picked: [] })} />
        </Setting>
        <Switch
          label="Remove name after it’s picked"
          description={config.removeAfterPick ? `${config.picked.length} of ${all.length} picked` : undefined}
          checked={config.removeAfterPick}
          onChange={(removeAfterPick) => update({ removeAfterPick })}
        />
        <div className="flex flex-wrap gap-2">
          <Button size="sm" icon={RotateCcw} disabled={!config.picked.length} onClick={() => update({ picked: [] })}>
            Put all names back
          </Button>
          <Button size="sm" variant="ghost" disabled={!config.history.length} onClick={() => update({ history: [] })}>
            Clear history
          </Button>
        </div>
      </SettingsView>
    )

  if (!all.length)
    return (
      <WidgetEmpty
        action={
          <Button size="sm" onClick={() => openSettings('classes')}>
            Add a class
          </Button>
        }
      >
        Choose a class or type some names in this widget’s settings.
      </WidgetEmpty>
    )

  const pick = () => {
    if (!pool.length) return
    primeAudio()
    clearInterval(timer.current)
    setRolling(true)
    setShowHistory(false)
    const winner = pool[Math.floor(Math.random() * pool.length)]
    let n = 0
    timer.current = setInterval(() => {
      n++
      if (n >= ROLLS) {
        clearInterval(timer.current)
        setShown(winner)
        setRolling(false)
        playChime()
        update({
          history: [winner, ...config.history].slice(0, 20),
          picked: config.removeAfterPick ? [...config.picked, winner] : config.picked,
        })
      } else {
        setShown(pool[Math.floor(Math.random() * pool.length)])
        playTick()
      }
    }, ROLL_MS)
  }

  return (
    <div className="flex h-full flex-col p-3">
      {showHistory ? (
        <ol className="min-h-0 flex-1 overflow-y-auto rounded-xl bg-canvas p-2 text-sm" aria-label="Recently picked">
          {config.history.map((n, i) => (
            <li key={i} className="flex gap-2 py-0.5">
              <span className="w-5 text-right text-ink-faint tabular-nums">{i + 1}</span>
              {n}
            </li>
          ))}
        </ol>
      ) : (
        <div className="grid min-h-0 flex-1 place-items-center text-center" aria-live="polite">
          <span
            className={cn(
              'max-w-full px-1 font-bold tracking-tight break-words',
              (shown ?? '').length > 14 ? 'text-2xl' : 'text-4xl',
              rolling ? 'text-ink-faint' : 'text-accent-strong',
              !rolling && shown && 'animate-pop-in',
            )}
          >
            {shown ?? '?'}
          </span>
        </div>
      )}
      <div className="mt-2 flex items-center justify-between gap-2">
        <span className="text-xs text-ink-faint">{config.removeAfterPick ? `${pool.length} left` : `${all.length} names`}</span>
        <div className="flex gap-1.5">
          <Button
            size="sm"
            variant={showHistory ? 'subtle' : 'ghost'}
            icon={History}
            aria-pressed={showHistory}
            disabled={!config.history.length}
            onClick={() => setShowHistory((s) => !s)}
            aria-label="History"
          />
          {pool.length ? (
            <Button size="sm" variant="primary" icon={Shuffle} onClick={pick} disabled={rolling}>
              Pick
            </Button>
          ) : (
            <Button size="sm" variant="primary" icon={RotateCcw} onClick={() => update({ picked: [] })}>
              Start again
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
