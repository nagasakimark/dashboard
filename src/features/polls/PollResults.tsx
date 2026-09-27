import { Star } from 'lucide-react'
import { cn } from '@/lib/cn'
import type { PollType, Results, ResultView } from './model'
import { CATEGORICAL, pieSlices } from './chartColors'

const pct = (v: number, total: number) => (total ? Math.round((v / total) * 100) : 0)

/** Horizontal bars: one series, one hue, each bar labelled with count and share. */
function Bars({ data, total, large, unit }: { data: { label: string; value: number }[]; total: number; large: boolean; unit?: string }) {
  const max = Math.max(1, ...data.map((d) => d.value))
  return (
    <ul className="space-y-2" aria-label="Results">
      {data.map((d) => (
        <li key={d.label} title={`${d.label}: ${d.value}${unit ? ` ${unit}` : ` (${pct(d.value, total)}%)`}`}>
          <div className={cn('flex items-baseline justify-between gap-2', large ? 'text-lg' : 'text-sm')}>
            <span className="min-w-0 truncate font-medium text-ink">{d.label}</span>
            <span className="shrink-0 text-ink-soft tabular-nums">
              <span className="font-semibold text-ink">{d.value}</span> {unit ?? `· ${pct(d.value, total)}%`}
            </span>
          </div>
          <div className={cn('mt-1 overflow-hidden rounded-r bg-ink/5', large ? 'h-5' : 'h-3')}>
            <div className="h-full rounded-r bg-accent transition-[width] duration-500" style={{ width: `${(d.value / max) * 100}%` }} />
          </div>
        </li>
      ))}
    </ul>
  )
}

/** Donut with the total in the middle and a legend (identity is never colour alone). */
function Donut({ data, total }: { data: { label: string; value: number }[]; total: number }) {
  const slices = pieSlices(data)
  const sum = slices.reduce((s, d) => s + d.value, 0)
  const r = 40
  const c = 2 * Math.PI * r
  let offset = 0
  return (
    <div className="flex flex-wrap items-center justify-center gap-4">
      <svg viewBox="0 0 100 100" className="size-40 shrink-0 -rotate-90" role="img" aria-label="Pie chart of results">
        <circle cx="50" cy="50" r={r} fill="none" stroke="currentColor" strokeWidth="16" className="text-ink/5" />
        {sum > 0 &&
          slices.map((d, i) => {
            const len = (d.value / sum) * c
            const el = (
              <circle
                key={d.label}
                cx="50"
                cy="50"
                r={r}
                fill="none"
                stroke={CATEGORICAL[i]}
                strokeWidth="16"
                strokeDasharray={`${Math.max(0, len - (slices.filter((s) => s.value).length > 1 ? 0.8 : 0))} ${c}`}
                strokeDashoffset={-offset}
              >
                <title>{`${d.label}: ${d.value} (${pct(d.value, total)}%)`}</title>
              </circle>
            )
            offset += len
            return el
          })}
        <text
          x="50"
          y="50"
          transform="rotate(90 50 50)"
          textAnchor="middle"
          dominantBaseline="central"
          className="fill-ink text-[15px] font-bold"
        >
          {total}
        </text>
      </svg>
      <ul className="min-w-32 space-y-1 text-sm" aria-label="Legend">
        {slices.map((d, i) => (
          <li key={d.label} className="flex items-center gap-2">
            <span className="size-3 shrink-0 rounded-sm" style={{ backgroundColor: CATEGORICAL[i] }} aria-hidden />
            <span className="min-w-0 flex-1 truncate">{d.label}</span>
            <span className="text-ink-soft tabular-nums">
              {d.value} · {pct(d.value, total)}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function Cloud({ words }: { words: { text: string; value: number }[] }) {
  if (!words.length) return <p className="py-6 text-center text-sm text-ink-faint">Answers will appear here.</p>
  const max = Math.max(...words.map((w) => w.value))
  return (
    <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 py-2" aria-label="Word cloud">
      {words.slice(0, 60).map((w, i) => (
        <span
          key={w.text}
          title={`${w.text}: ${w.value}`}
          className="leading-tight font-bold"
          style={{ fontSize: 14 + (w.value / max) * 30, color: i < 8 ? 'var(--color-ink)' : 'var(--color-ink-soft)' }}
        >
          {w.text}
        </span>
      ))}
    </div>
  )
}

function Rating({ results, large }: { results: Results; large: boolean }) {
  return (
    <div className="space-y-3">
      <div className="text-center">
        <div className={cn('font-bold tabular-nums', large ? 'text-6xl' : 'text-4xl')}>{results.ratingAverage.toFixed(1)}</div>
        <div className="mt-1 flex justify-center gap-0.5 text-amber-500" aria-label={`Average ${results.ratingAverage.toFixed(1)} stars`}>
          {results.ratingDist.map((d) => (
            <Star key={d.stars} size={18} aria-hidden fill={d.stars <= Math.round(results.ratingAverage) ? 'currentColor' : 'none'} />
          ))}
        </div>
      </div>
      <Bars
        data={[...results.ratingDist].reverse().map((d) => ({ label: `${d.stars} ★`, value: d.value }))}
        total={results.total}
        large={large}
      />
    </div>
  )
}

function Ranking({ results, large }: { results: Results; large: boolean }) {
  return (
    <ol className="space-y-1.5" aria-label="Average ranking">
      {results.averageRanks.map((a, i) => (
        <li key={a.label} className={cn('flex items-center gap-3 rounded-xl bg-canvas px-3 py-2', large ? 'text-lg' : 'text-sm')}>
          <span className="grid size-7 shrink-0 place-items-center rounded-full bg-accent text-sm font-bold text-white">{i + 1}</span>
          <span className="min-w-0 flex-1 truncate font-semibold">{a.label}</span>
          <span className="shrink-0 text-xs text-ink-soft tabular-nums">{a.appearances ? `avg ${a.averageRank.toFixed(1)}` : '—'}</span>
        </li>
      ))}
    </ol>
  )
}

export function PollResults({
  results,
  view,
  type,
  large = false,
}: {
  results: Results
  view: ResultView
  type: PollType
  large?: boolean
}) {
  if (view === 'pie') return <Donut data={results.counts} total={results.total} />
  if (view === 'cloud') return <Cloud words={results.words} />
  if (view === 'rating') return <Rating results={results} large={large} />
  if (view === 'rank') return <Ranking results={results} large={large} />
  return <Bars data={results.counts} total={results.total} large={large} unit={type === 'rank' ? 'pts' : undefined} />
}
