import { Input, Switch } from '@/components/ui'
import type { WidgetProps } from '../types'
import type { Light, TrafficLightConfig } from './configs'
import { Setting, SettingsView } from './controls'

const LIGHTS: { id: Light; on: string; off: string; name: string }[] = [
  { id: 'red', on: '#ef4444', off: '#4b1d1d', name: 'Red' },
  { id: 'yellow', on: '#facc15', off: '#4a3f12', name: 'Amber' },
  { id: 'green', on: '#22c55e', off: '#143d23', name: 'Green' },
]

export default function TrafficLight({ config, update, settings, closeSettings, width, height }: WidgetProps<TrafficLightConfig>) {
  if (settings)
    return (
      <SettingsView onDone={closeSettings}>
        <Switch label="Show labels" checked={config.showLabels} onChange={(showLabels) => update({ showLabels })} />
        {LIGHTS.map((l) => (
          <Setting key={l.id} label={`${l.name} label`}>
            <Input
              aria-label={`${l.name} label`}
              value={config.labels[l.id]}
              onChange={(e) => update({ labels: { ...config.labels, [l.id]: e.target.value } })}
              className="h-9"
            />
          </Setting>
        ))}
      </SettingsView>
    )

  const labelSpace = config.showLabels ? 26 : 0
  const d = Math.max(28, Math.min(width - 48, (height - 36) / 3 - labelSpace - 8))
  return (
    <div className="flex h-full items-center justify-center p-2">
      <div
        className="flex flex-col items-center gap-2 rounded-[28px] bg-[#1f2430] px-4 py-3 shadow-inner"
        role="radiogroup"
        aria-label="Traffic light"
      >
        {LIGHTS.map((l) => {
          const active = config.active === l.id
          return (
            <button
              key={l.id}
              type="button"
              role="radio"
              aria-checked={active}
              aria-label={config.labels[l.id] || l.name}
              onClick={() => update({ active: active ? null : l.id })}
              className="flex flex-col items-center gap-1"
            >
              <span
                className="block rounded-full transition-[background,box-shadow] duration-200"
                style={{
                  width: d,
                  height: d,
                  backgroundColor: active ? l.on : l.off,
                  boxShadow: active ? `0 0 ${d / 3}px ${l.on}, inset 0 -4px 10px rgb(0 0 0 / 0.2)` : 'inset 0 4px 10px rgb(0 0 0 / 0.5)',
                }}
              />
              {config.showLabels && (
                <span className="max-w-[9rem] truncate text-sm font-bold" style={{ color: active ? l.on : '#9ca3af' }}>
                  {config.labels[l.id]}
                </span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
