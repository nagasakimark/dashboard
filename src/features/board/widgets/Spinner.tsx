import { useEffect, useRef, useState } from 'react'
import { RotateCcw, RotateCw } from 'lucide-react'
import { Button, Switch } from '@/components/ui'
import { useBoardContext } from '../context'
import { sourceNames } from '../rosters'
import { playChime, primeAudio } from '../sound'
import type { WidgetProps } from '../types'
import type { SpinnerConfig } from './configs'
import { NameSourcePicker, Setting, SettingsView, WidgetEmpty } from './controls'
import { textOn } from './palette'
import { segmentAt, segmentColor, spinTarget } from './wheel'

const SPIN_MS = 4000

function slicePath(i: number, n: number, r: number) {
  const a0 = (i / n) * 2 * Math.PI
  const a1 = ((i + 1) / n) * 2 * Math.PI
  const p = (a: number) => `${r + r * Math.sin(a)},${r - r * Math.cos(a)}`
  return n === 1
    ? `M0,${r}a${r},${r} 0 1,0 ${2 * r},0a${r},${r} 0 1,0 -${2 * r},0`
    : `M${r},${r}L${p(a0)}A${r},${r} 0 ${a1 - a0 > Math.PI ? 1 : 0},1 ${p(a1)}Z`
}

export default function Spinner({ config, update, settings, closeSettings, width, height }: WidgetProps<SpinnerConfig>) {
  const { rosters } = useBoardContext()
  const all = sourceNames(config.source, rosters)
  const options = config.removeAfterSpin ? all.filter((o) => !config.removed.includes(o)) : all
  const [angle, setAngle] = useState(config.angle)
  const [spinning, setSpinning] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)
  useEffect(() => () => clearTimeout(timer.current), [])

  if (settings)
    return (
      <SettingsView onDone={closeSettings}>
        <Setting label="Wheel options" hint="Up to 40 options. Names show on the wheel when there are 24 or fewer.">
          <NameSourcePicker
            source={config.source}
            typedLabel="Type options"
            placeholder="One option per line"
            onChange={(source) => update({ source, removed: [], result: null })}
          />
        </Setting>
        <Switch
          label="Remove the chosen option after each spin"
          checked={config.removeAfterSpin}
          onChange={(removeAfterSpin) => update({ removeAfterSpin })}
        />
        <Button size="sm" icon={RotateCcw} disabled={!config.removed.length} onClick={() => update({ removed: [], result: null })}>
          Put all options back ({config.removed.length})
        </Button>
      </SettingsView>
    )

  if (all.length < 2) return <WidgetEmpty>Add at least two options (or choose a class) in this widget’s settings.</WidgetEmpty>

  const wheel = options.slice(0, 40)
  const n = wheel.length
  const size = Math.max(120, Math.min(width - 24, height - 112))
  const r = 100
  const labels = n <= 24

  const spin = () => {
    if (n < 1 || spinning) return
    primeAudio()
    const target = spinTarget(angle)
    setAngle(target)
    setSpinning(true)
    timer.current = setTimeout(() => {
      setSpinning(false)
      const winner = wheel[segmentAt(target, n)]
      playChime()
      update({
        angle: target % 360,
        result: winner,
        removed: config.removeAfterSpin ? [...config.removed, winner] : config.removed,
      })
      setAngle(target % 360)
    }, SPIN_MS)
  }

  return (
    <div className="flex h-full flex-col items-center gap-2 p-3">
      <div className="relative" style={{ width: size, height: size }}>
        <svg
          viewBox={`0 0 ${2 * r} ${2 * r}`}
          width={size}
          height={size}
          role="img"
          aria-label={`Wheel with ${n} options`}
          style={{
            transform: `rotate(${angle}deg)`,
            transition: spinning ? `transform ${SPIN_MS}ms cubic-bezier(0.15, 0.7, 0.1, 1)` : 'none',
          }}
          className="cursor-pointer drop-shadow-md"
          onClick={spin}
        >
          {wheel.map((o, i) => {
            const fill = segmentColor(i, n)
            const mid = ((i + 0.5) / n) * 360
            return (
              <g key={i}>
                <path d={slicePath(i, n, r)} fill={fill} stroke="white" strokeWidth="1" />
                <text
                  x={labels ? 2 * r - 10 : r}
                  y={labels ? r : 16}
                  transform={labels ? `rotate(${mid - 90} ${r} ${r})` : `rotate(${mid} ${r} ${r})`}
                  textAnchor={labels ? 'end' : 'middle'}
                  dominantBaseline="middle"
                  fontSize={labels ? Math.max(6, Math.min(13, 150 / n)) : 9}
                  fontWeight="700"
                  fill={textOn(fill)}
                >
                  {labels ? (o.length > 14 ? `${o.slice(0, 13)}…` : o) : i + 1}
                </text>
              </g>
            )
          })}
          <circle cx={r} cy={r} r="10" fill="white" stroke="#1e2233" strokeWidth="2" />
        </svg>
        <div
          className="absolute -top-1 left-1/2 size-0 -translate-x-1/2 border-x-[11px] border-t-[20px] border-x-transparent border-t-ink drop-shadow"
          aria-hidden
        />
      </div>
      <div className="flex min-h-9 w-full items-center justify-center text-center" aria-live="polite">
        {!spinning && config.result && (
          <span className="animate-pop-in truncate rounded-xl bg-accent-soft px-3 py-1 text-lg font-bold text-accent-strong">
            🎉 {config.result}
          </span>
        )}
      </div>
      <div className="flex items-center gap-2">
        {n ? (
          <Button size="sm" variant="primary" icon={RotateCw} onClick={spin} disabled={spinning}>
            Spin
          </Button>
        ) : (
          <Button size="sm" variant="primary" icon={RotateCcw} onClick={() => update({ removed: [], result: null })}>
            Put all options back
          </Button>
        )}
        {config.removeAfterSpin && <span className="text-xs text-ink-faint">{n} left</span>}
      </div>
    </div>
  )
}
