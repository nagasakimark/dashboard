import { Check, RotateCcw } from 'lucide-react'
import { Button, Input, Textarea } from '@/components/ui'
import { cn } from '@/lib/cn'
import { splitLines } from '../rosters'
import type { WidgetProps } from '../types'
import type { ChecklistConfig, ChecklistItem } from './configs'
import { Setting, SettingsView } from './controls'
import { parseLink } from './format'

/** Rebuild items from edited lines, keeping ticks on lines that didn't change. */
function fromLines(text: string, old: ChecklistItem[]): ChecklistItem[] {
  const pool = [...old]
  return splitLines(text).map((line, i) => {
    const j = pool.findIndex((o) => o.text === line)
    const kept = j >= 0 ? pool.splice(j, 1)[0] : null
    return { id: kept?.id ?? `i${Date.now()}-${i}`, text: line, done: kept?.done ?? false }
  })
}

export default function Checklist({ config, update, settings, closeSettings }: WidgetProps<ChecklistConfig>) {
  const done = config.items.filter((i) => i.done).length
  const total = config.items.length

  if (settings)
    return (
      <SettingsView onDone={closeSettings}>
        <Setting label="Title">
          <Input aria-label="Title" value={config.title} onChange={(e) => update({ title: e.target.value })} className="h-9" />
        </Setting>
        <Setting label="Items" hint="One per line. Write [label](https://…) to make a link.">
          <Textarea
            aria-label="Items"
            defaultValue={config.items.map((i) => i.text).join('\n')}
            onChange={(e) => update({ items: fromLines(e.target.value, config.items) })}
            className="min-h-40 text-sm"
          />
        </Setting>
      </SettingsView>
    )

  return (
    <div className="flex h-full flex-col p-3">
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="truncate text-lg font-bold">{config.title}</h3>
        <span className="shrink-0 text-xs font-semibold text-ink-soft tabular-nums">
          {done}/{total} done
        </span>
      </div>
      <div
        className="mt-1.5 h-2 overflow-hidden rounded-full bg-ink/8"
        role="progressbar"
        aria-valuenow={done}
        aria-valuemax={total}
        aria-label="Progress"
      >
        <div
          className="h-full rounded-full bg-success transition-[width] duration-300"
          style={{ width: `${total ? (done / total) * 100 : 0}%` }}
        />
      </div>
      <ul className="mt-2 min-h-0 flex-1 space-y-1 overflow-y-auto">
        {config.items.map((item) => {
          const link = parseLink(item.text)
          return (
            <li key={item.id} className="flex items-center gap-2">
              <button
                type="button"
                role="checkbox"
                aria-checked={item.done}
                aria-label={link?.label ?? item.text}
                onClick={() => update({ items: config.items.map((i) => (i.id === item.id ? { ...i, done: !i.done } : i)) })}
                className={cn(
                  'grid size-6 shrink-0 place-items-center rounded-md border-2 transition-colors',
                  item.done ? 'border-success bg-success text-white' : 'border-ink-faint/60 hover:border-success',
                )}
              >
                {item.done && <Check size={15} strokeWidth={3} aria-hidden />}
              </button>
              {link ? (
                <a
                  href={link.url}
                  target="_blank"
                  rel="noreferrer"
                  className={cn('min-w-0 flex-1 truncate font-medium text-accent underline', item.done && 'opacity-50')}
                >
                  {link.label}
                </a>
              ) : (
                <span className={cn('min-w-0 flex-1 text-[15px] leading-snug', item.done && 'text-ink-faint line-through')}>
                  {item.text}
                </span>
              )}
            </li>
          )
        })}
      </ul>
      {done > 0 && (
        <Button
          size="sm"
          variant="ghost"
          icon={RotateCcw}
          className="mt-1 self-end"
          onClick={() => update({ items: config.items.map((i) => ({ ...i, done: false })) })}
        >
          Untick all
        </Button>
      )}
    </div>
  )
}
