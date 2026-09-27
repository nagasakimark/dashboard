import { useId, useState } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/cn'

interface Props {
  value: string[]
  onChange: (tags: string[]) => void
  suggestions?: string[]
  placeholder?: string
  id?: string
  className?: string
}

/** Chip-style tag entry. Enter or comma adds; Backspace removes the last. */
export function TagInput({ value, onChange, suggestions = [], placeholder = 'Add a tag…', id, className }: Props) {
  const [text, setText] = useState('')
  const listId = useId()
  const add = (raw: string) => {
    const tag = raw.trim().replace(/,$/, '').trim()
    if (tag && !value.some((t) => t.toLowerCase() === tag.toLowerCase())) onChange([...value, tag])
    setText('')
  }
  const open = suggestions.filter((s) => !value.includes(s) && s.toLowerCase().includes(text.toLowerCase()))

  return (
    <div
      className={cn(
        'flex min-h-10 flex-wrap items-center gap-1.5 rounded-xl border border-line bg-surface px-2 py-1.5 focus-within:border-accent focus-within:ring-3 focus-within:ring-accent/15',
        className,
      )}
    >
      {value.map((t) => (
        <span
          key={t}
          className="inline-flex items-center gap-1 rounded-lg bg-accent-soft py-0.5 pr-1 pl-2 text-sm font-medium text-accent-strong"
        >
          {t}
          <button
            type="button"
            aria-label={`Remove tag ${t}`}
            onClick={() => onChange(value.filter((x) => x !== t))}
            className="rounded p-0.5 hover:bg-accent-muted"
          >
            <X size={12} />
          </button>
        </span>
      ))}
      <input
        id={id}
        list={listId}
        value={text}
        placeholder={value.length ? '' : placeholder}
        onChange={(e) => (e.target.value.endsWith(',') ? add(e.target.value) : setText(e.target.value))}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault()
            add(text)
          } else if (e.key === 'Backspace' && !text && value.length) onChange(value.slice(0, -1))
        }}
        onBlur={() => text.trim() && add(text)}
        className="min-w-24 flex-1 bg-transparent px-1 text-sm outline-none placeholder:text-ink-faint"
      />
      <datalist id={listId}>
        {open.slice(0, 20).map((s) => (
          <option key={s} value={s} />
        ))}
      </datalist>
    </div>
  )
}
