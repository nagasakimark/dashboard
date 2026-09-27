import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router'
import { useLiveQuery } from 'dexie-react-hooks'
import { ArrowLeft, BookOpen, Gamepad2, Search } from 'lucide-react'
import { ButtonLink, Input, Spinner, Tabs } from '@/components/ui'
import { db } from '@/data/db'
import { BUILT_IN_SETS } from '@/features/games/data'
import { JHS_BOOKS, jhsCover, loadBook, type JhsBook } from './data'
import { Bold, GrammarCard } from './parts'
import { Runner } from './Runner'

type View = 'exercises' | 'grammar'

/** The unit word set covering this textbook page (the last unit starting at or before it). */
function wordSetFor(bookId: string, page: number) {
  return (
    BUILT_IN_SETS.filter((s) => s.id.startsWith(`jhs-${bookId}-unit-`) && s.pages?.length)
      .sort((a, b) => Math.min(...a.pages!) - Math.min(...b.pages!))
      .findLast((u) => Math.min(...u.pages!) <= page) ?? null
  )
}

/** JHS Classroom Mode: New Horizon 1–3 exercise sets and grammar library. */
export default function JhsPage() {
  const [params, setParams] = useSearchParams()
  const bookId = params.get('book')
  const setId = params.get('set')
  const view: View = params.get('view') === 'grammar' ? 'grammar' : 'exercises'
  const [book, setBook] = useState<JhsBook | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [q, setQ] = useState('')

  useEffect(() => {
    if (!bookId) return
    let off = false
    loadBook(bookId)
      .then((b) => !off && setBook(b))
      .catch((e: unknown) => !off && setError(e instanceof Error ? e.message : 'Couldn’t load that textbook.'))
    return () => {
      off = true
    }
  }, [bookId])

  // Planner textbook made from the NH preset, to link sections.
  const planner = useLiveQuery(async () => {
    if (!bookId) return null
    const tb = (await db.textbooks.toArray()).find((t) => t.preset?.split('-')[0] === bookId)
    return tb ? { id: tb.id, sections: await db.sections.where('textbookId').equals(tb.id).toArray() } : null
  }, [bookId])

  const set = book?.exerciseSets.find((s) => s.id === setId) ?? null
  const shownBook = book?.id === bookId ? book : null
  const grammar = useMemo(() => {
    const t = q.trim().toLowerCase()
    return (shownBook?.grammarPoints ?? []).filter(
      (g) => !t || `${g.title} ${g.sectionName} ${g.englishExplanation} ${g.japaneseDescription}`.toLowerCase().includes(t),
    )
  }, [shownBook, q])

  const nav = (next: Record<string, string | null>) =>
    setParams((p) => {
      for (const [k, v] of Object.entries(next)) {
        if (v === null) p.delete(k)
        else p.set(k, v)
      }
      return p
    })

  const back = set ? () => nav({ set: null }) : bookId ? () => nav({ book: null, set: null, view: null }) : null
  const plannerSection = set && planner ? planner.sections.find((s) => s.page === set.page) : null
  const words = set && bookId ? wordSetFor(bookId, set.page) : null

  return (
    <div className="fixed inset-0 flex flex-col bg-[linear-gradient(160deg,#f0f9ff_0%,#f8fafc_45%,#eef2ff_100%)]">
      <header className="flex shrink-0 flex-wrap items-center gap-2 border-b border-line/70 bg-surface/80 px-3 py-1.5 backdrop-blur">
        {back ? (
          <button
            type="button"
            onClick={back}
            className="inline-flex h-10 items-center gap-1.5 rounded-xl px-3 text-sm font-bold hover:bg-ink/6"
          >
            <ArrowLeft size={18} aria-hidden /> Back
          </button>
        ) : (
          <ButtonLink to="/games" variant="ghost" size="sm" icon={ArrowLeft}>
            Games
          </ButtonLink>
        )}
        <h1 className="min-w-0 flex-1 truncate text-lg font-black">
          {set ? (
            <>
              {set.ksNumber} · <Bold text={set.title} />
            </>
          ) : (
            (shownBook?.title ?? 'JHS Classroom Mode')
          )}
        </h1>
        {plannerSection && planner && (
          <ButtonLink to={`/textbooks/${planner.id}`} size="sm" variant="ghost" icon={BookOpen}>
            p.{set?.page} in planner
          </ButtonLink>
        )}
        {words && (
          <ButtonLink to={`/games?set=${words.id}`} size="sm" variant="subtle" icon={Gamepad2}>
            Unit word games
          </ButtonLink>
        )}
      </header>

      <main className="min-h-0 flex-1 overflow-y-auto">
        {!bookId ? (
          <div className="mx-auto grid max-w-4xl grid-cols-1 gap-4 p-6 sm:grid-cols-3">
            {JHS_BOOKS.map((b) => (
              <button
                key={b.id}
                type="button"
                onClick={() => nav({ book: b.id })}
                className="flex flex-col items-center gap-3 rounded-3xl bg-surface p-4 shadow-sm ring-1 ring-line transition-all hover:-translate-y-0.5 hover:shadow-pop"
              >
                <img src={jhsCover(b.id)} alt="" className="aspect-[3/4] w-full rounded-2xl object-cover shadow-md" />
                <span className="text-xl font-black">{b.title}</span>
              </button>
            ))}
          </div>
        ) : error ? (
          <p className="p-8 text-center text-danger">{error}</p>
        ) : !shownBook ? (
          <div className="grid h-full place-items-center">
            <Spinner />
          </div>
        ) : set ? (
          <Runner key={set.id} set={set} />
        ) : (
          <div className="mx-auto max-w-6xl space-y-4 p-4 sm:p-6">
            <Tabs<View>
              label="View"
              value={view}
              onChange={(v) => nav({ view: v === 'exercises' ? null : v })}
              items={[
                { id: 'exercises', label: 'Exercise sets', count: shownBook.exerciseSets.length },
                { id: 'grammar', label: 'Grammar library', count: shownBook.grammarPoints.length },
              ]}
            />
            {view === 'exercises' ? (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {shownBook.exerciseSets.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => nav({ set: s.id })}
                    className="flex flex-col gap-1 rounded-3xl bg-surface p-4 text-left shadow-sm ring-1 ring-line transition-all hover:-translate-y-0.5 hover:shadow-pop hover:ring-accent-muted"
                  >
                    <span className="flex items-center justify-between gap-2 text-xs font-bold text-accent-strong">
                      <span className="rounded-lg bg-accent-soft px-2 py-0.5">{s.ksNumber}</span>
                      <span className="text-ink-faint">
                        p.{s.page} · {s.exercises.length} questions
                      </span>
                    </span>
                    <span className="text-lg leading-snug font-bold">
                      <Bold text={s.title} />
                    </span>
                    <span className="truncate text-sm text-ink-soft">{s.sectionName}</span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                <div className="relative max-w-md">
                  <Search size={16} className="absolute top-1/2 left-3 -translate-y-1/2 text-ink-faint" aria-hidden />
                  <Input
                    aria-label="Search grammar"
                    placeholder="Search grammar points"
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    className="pl-9"
                  />
                </div>
                {grammar.map((g) => (
                  <GrammarCard key={g.id} point={g} collapsible />
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
