import { useEffect, useRef, useState } from 'react'
import { Dices } from 'lucide-react'
import { Button } from '@/components/ui'
import { cn } from '@/lib/cn'
import type { WidgetProps } from '../types'
import type { DiceConfig } from './configs'
import { Segmented, Setting, SettingsView, Stepper } from './controls'

const PIPS: Record<number, [number, number][]> = {
  1: [[50, 50]],
  2: [
    [28, 28],
    [72, 72],
  ],
  3: [
    [28, 28],
    [50, 50],
    [72, 72],
  ],
  4: [
    [28, 28],
    [72, 28],
    [28, 72],
    [72, 72],
  ],
  5: [
    [28, 28],
    [72, 28],
    [50, 50],
    [28, 72],
    [72, 72],
  ],
  6: [
    [28, 26],
    [72, 26],
    [28, 50],
    [72, 50],
    [28, 74],
    [72, 74],
  ],
}

function Die({ value, sides, rolling, size }: { value: number; sides: number; rolling: boolean; size: number }) {
  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      role="img"
      aria-label={String(value)}
      className={cn('drop-shadow-sm', rolling && 'animate-[spin_0.5s_linear_infinite]')}
    >
      <rect x="4" y="4" width="92" height="92" rx="18" fill="white" stroke="#1e2233" strokeWidth="4" />
      {sides === 6 ? (
        PIPS[value]?.map(([x, y], i) => <circle key={i} cx={x} cy={y} r="9" fill="#1e2233" />)
      ) : (
        <text x="50" y="66" textAnchor="middle" fontSize="44" fontWeight="800" fill="#1e2233">
          {value}
        </text>
      )}
    </svg>
  )
}

const roll = (count: number, sides: number) => Array.from({ length: count }, () => 1 + Math.floor(Math.random() * sides))

export default function Dice({ config, update, settings, closeSettings }: WidgetProps<DiceConfig>) {
  const [values, setValues] = useState(() => roll(config.count, config.sides))
  // Re-roll when the dice change (adjusting state during render, not in an effect).
  const [shape, setShape] = useState(`${config.count}d${config.sides}`)
  if (shape !== `${config.count}d${config.sides}`) {
    setShape(`${config.count}d${config.sides}`)
    setValues(roll(config.count, config.sides))
  }
  const [rolling, setRolling] = useState(false)
  const timer = useRef<ReturnType<typeof setInterval>>(undefined)

  useEffect(() => () => clearInterval(timer.current), [])

  if (settings)
    return (
      <SettingsView onDone={closeSettings}>
        <Setting label="Number of dice">
          <Stepper label="Number of dice" value={config.count} min={1} max={6} onChange={(count) => update({ count })} />
        </Setting>
        <Setting label="Sides">
          <Segmented
            label="Sides"
            value={config.sides}
            options={[4, 6, 8, 10, 12, 20].map((n) => ({ value: n, label: `d${n}` }))}
            onChange={(sides) => update({ sides })}
          />
        </Setting>
      </SettingsView>
    )

  const go = () => {
    clearInterval(timer.current)
    setRolling(true)
    let n = 0
    timer.current = setInterval(() => {
      setValues(roll(config.count, config.sides))
      if (++n >= 8) {
        clearInterval(timer.current)
        setRolling(false)
      }
    }, 75)
  }

  const size = config.count === 1 ? 104 : config.count <= 2 ? 72 : config.count <= 4 ? 56 : 46
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 p-3">
      <button type="button" onClick={go} aria-label="Roll the dice" className="flex max-w-full flex-wrap justify-center gap-2">
        {values.map((v, i) => (
          <Die key={i} value={v} sides={config.sides} rolling={rolling} size={size} />
        ))}
      </button>
      <div className="flex h-6 items-center text-sm font-semibold text-ink-soft" aria-live="polite">
        {config.count > 1 && !rolling && <>Total {values.reduce((a, b) => a + b, 0)}</>}
      </div>
      <Button size="sm" variant="primary" icon={Dices} onClick={go} disabled={rolling}>
        Roll
      </Button>
    </div>
  )
}
