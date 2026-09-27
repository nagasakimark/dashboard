import { format } from 'date-fns'
import { Switch } from '@/components/ui'
import { useNow } from '@/lib/useNow'
import type { WidgetProps } from '../types'
import type { ClockConfig } from './configs'
import { SettingsView } from './controls'

export default function Clock({ config, update, settings, closeSettings, width, height }: WidgetProps<ClockConfig>) {
  const now = useNow(config.seconds ? 1000 : 10_000)

  if (settings)
    return (
      <SettingsView onDone={closeSettings}>
        <Switch label="Analogue clock" checked={config.analog} onChange={(analog) => update({ analog })} />
        <Switch label="24-hour time" checked={config.hour24} onChange={(hour24) => update({ hour24 })} />
        <Switch label="Show seconds" checked={config.seconds} onChange={(seconds) => update({ seconds })} />
        <Switch label="Show date" checked={config.date} onChange={(date) => update({ date })} />
      </SettingsView>
    )

  const dateLine = config.date && <div className="truncate font-medium text-ink-soft">{format(now, 'EEEE d MMMM')}</div>

  if (config.analog) {
    const size = Math.max(60, Math.min(width, height - (config.date ? 44 : 16)) - 16)
    const h = (now.getHours() % 12) + now.getMinutes() / 60
    const m = now.getMinutes() + now.getSeconds() / 60
    const hand = (deg: number, len: number, w: number, color: string) => (
      <line
        x1="50"
        y1="50"
        x2={50 + len * Math.sin((deg * Math.PI) / 180)}
        y2={50 - len * Math.cos((deg * Math.PI) / 180)}
        stroke={color}
        strokeWidth={w}
        strokeLinecap="round"
      />
    )
    return (
      <div className="flex h-full flex-col items-center justify-center gap-1 p-2" role="timer" aria-label={format(now, 'h:mm a')}>
        <svg viewBox="0 0 100 100" width={size} height={size} aria-hidden>
          <circle cx="50" cy="50" r="48" fill="white" stroke="#1e2233" strokeWidth="2" />
          {Array.from({ length: 60 }, (_, i) => {
            const a = (i * 6 * Math.PI) / 180
            const inner = i % 5 === 0 ? 40 : 44
            return (
              <line
                key={i}
                x1={50 + inner * Math.sin(a)}
                y1={50 - inner * Math.cos(a)}
                x2={50 + 46 * Math.sin(a)}
                y2={50 - 46 * Math.cos(a)}
                stroke="#1e2233"
                strokeWidth={i % 5 === 0 ? 1.8 : 0.6}
              />
            )
          })}
          {Array.from({ length: 12 }, (_, i) => {
            const a = ((i + 1) * 30 * Math.PI) / 180
            return (
              <text
                key={i}
                x={50 + 33 * Math.sin(a)}
                y={50 - 33 * Math.cos(a) + 3.2}
                textAnchor="middle"
                fontSize="9"
                fontWeight="600"
                fill="#1e2233"
              >
                {i + 1}
              </text>
            )
          })}
          {hand(h * 30, 24, 3.5, '#1e2233')}
          {hand(m * 6, 34, 2.4, '#1e2233')}
          {config.seconds && hand(now.getSeconds() * 6, 38, 1, '#dc2626')}
          <circle cx="50" cy="50" r="2.5" fill="#1e2233" />
        </svg>
        <div className="text-sm">{dateLine}</div>
      </div>
    )
  }

  const time = format(now, config.hour24 ? (config.seconds ? 'HH:mm:ss' : 'HH:mm') : config.seconds ? 'h:mm:ss' : 'h:mm')
  const chars = time.length + (config.hour24 ? 0 : 1.5)
  const fontSize = Math.max(18, Math.min((width - 24) / (chars * 0.62), (height - (config.date ? 48 : 20)) * 0.8))
  return (
    <div className="flex h-full flex-col items-center justify-center p-3 text-center" role="timer">
      <div className="leading-none font-bold tracking-tight tabular-nums" style={{ fontSize }}>
        {time}
        {!config.hour24 && <span className="ml-1 text-[0.35em] font-semibold text-ink-soft">{format(now, 'a')}</span>}
      </div>
      {dateLine && (
        <div className="mt-2 max-w-full" style={{ fontSize: Math.max(12, Math.min(22, fontSize / 3.2)) }}>
          {dateLine}
        </div>
      )}
    </div>
  )
}
