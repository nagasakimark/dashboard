import { useId, type ReactNode } from 'react'
import { Minus, Plus, Users } from 'lucide-react'
import { Button, Select, Textarea } from '@/components/ui'
import { cn } from '@/lib/cn'
import { useBoardContext } from '../context'
import type { NameSource } from '../rosters'
import { SWATCHES } from './palette'

/** Scrollable settings form shown in place of a widget's body. */
export function SettingsView({ children, onDone }: { children: ReactNode; onDone: () => void }) {
  return (
    <div className="flex h-full flex-col">
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-3">{children}</div>
      <div className="flex justify-end border-t border-line bg-canvas/70 px-3 py-2">
        <Button size="sm" variant="primary" onClick={onDone}>
          Done
        </Button>
      </div>
    </div>
  )
}

export function Setting({ label, children, hint }: { label: string; children: ReactNode; hint?: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <div className="text-[11px] font-semibold tracking-wide text-ink-soft uppercase">{label}</div>
      {children}
      {hint && <p className="text-xs text-ink-faint">{hint}</p>}
    </div>
  )
}

export function Segmented<T extends string | number>({
  value,
  options,
  onChange,
  label,
}: {
  value: T
  options: { value: T; label: ReactNode }[]
  onChange: (v: T) => void
  label: string
}) {
  return (
    <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-1 rounded-xl bg-ink/5 p-1">
      {options.map((o) => (
        <button
          key={String(o.value)}
          type="button"
          role="radio"
          aria-checked={o.value === value}
          onClick={() => onChange(o.value)}
          className={cn(
            'h-7 min-w-8 flex-1 rounded-lg px-2 text-xs font-semibold whitespace-nowrap transition-colors',
            o.value === value ? 'bg-surface text-ink shadow-sm' : 'text-ink-soft hover:text-ink',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function Stepper({
  value,
  min,
  max,
  step = 1,
  onChange,
  label,
  format = String,
}: {
  value: number
  min: number
  max: number
  step?: number
  onChange: (v: number) => void
  label: string
  format?: (v: number) => ReactNode
}) {
  const clamp = (v: number) => Math.max(min, Math.min(max, v))
  return (
    <div className="flex items-center gap-2" role="group" aria-label={label}>
      <button
        type="button"
        aria-label={`Decrease ${label.toLowerCase()}`}
        disabled={value <= min}
        onClick={() => onChange(clamp(value - step))}
        className="grid size-8 place-items-center rounded-lg border border-line bg-surface hover:bg-canvas disabled:opacity-40"
      >
        <Minus size={15} aria-hidden />
      </button>
      <output aria-live="polite" className="min-w-10 text-center text-sm font-semibold tabular-nums">
        {format(value)}
      </output>
      <button
        type="button"
        aria-label={`Increase ${label.toLowerCase()}`}
        disabled={value >= max}
        onClick={() => onChange(clamp(value + step))}
        className="grid size-8 place-items-center rounded-lg border border-line bg-surface hover:bg-canvas disabled:opacity-40"
      >
        <Plus size={15} aria-hidden />
      </button>
    </div>
  )
}

export function ColorPicker({
  value,
  onChange,
  label,
  colors = SWATCHES,
}: {
  value: string
  onChange: (c: string) => void
  label: string
  colors?: string[]
}) {
  return (
    <div role="radiogroup" aria-label={label} className="flex flex-wrap items-center gap-1.5">
      {colors.map((c) => (
        <button
          key={c}
          type="button"
          role="radio"
          aria-checked={value.toLowerCase() === c.toLowerCase()}
          aria-label={c}
          onClick={() => onChange(c)}
          className={cn(
            'size-6 rounded-full border border-black/10 ring-offset-1 transition-transform hover:scale-110',
            value.toLowerCase() === c.toLowerCase() && 'ring-2 ring-ink',
          )}
          style={{ backgroundColor: c }}
        />
      ))}
      <input
        type="color"
        aria-label={`Custom ${label.toLowerCase()}`}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="size-7 cursor-pointer rounded border-0 bg-transparent p-0"
      />
    </div>
  )
}

/** Choose a saved class list or type names; shared by Random Name, Group Maker and Spinner. */
export function NameSourcePicker({
  source,
  onChange,
  typedLabel = 'Type names',
  placeholder = 'One name per line',
}: {
  source: NameSource
  onChange: (s: NameSource) => void
  typedLabel?: string
  placeholder?: string
}) {
  const { rosters, openSettings, setLastRosterId } = useBoardContext()
  const id = useId()
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Select
          id={id}
          aria-label="Class list"
          value={source.rosterId ?? ''}
          onChange={(e) => {
            const rosterId = e.target.value || null
            onChange({ ...source, rosterId })
            if (rosterId) setLastRosterId(rosterId)
          }}
          className="h-9"
        >
          <option value="">{typedLabel}</option>
          {rosters.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name} ({r.students.length})
            </option>
          ))}
        </Select>
        <Button size="sm" variant="ghost" icon={Users} onClick={() => openSettings('classes')} title="Manage classes">
          Classes
        </Button>
      </div>
      {!source.rosterId && (
        <Textarea
          aria-label={typedLabel}
          value={source.names}
          placeholder={placeholder}
          onChange={(e) => onChange({ ...source, names: e.target.value })}
          className="min-h-28 text-sm"
        />
      )}
    </div>
  )
}

/** Centred message used when a widget has nothing to show yet. */
export function WidgetEmpty({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="grid h-full place-items-center p-4 text-center">
      <div className="space-y-3">
        <p className="text-sm text-ink-soft">{children}</p>
        {action}
      </div>
    </div>
  )
}
