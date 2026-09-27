import { Link } from 'react-router'
import { useLiveQuery } from 'dexie-react-hooks'
import { BookOpen, ExternalLink, GraduationCap } from 'lucide-react'
import { ButtonLink, EmptyState } from '@/components/ui'
import { db } from '@/data/db'
import { TextbookCover } from '@/features/textbooks/TextbookCover'

/** The planner's textbooks with their digital-textbook and ALTopedia links. */
export function TextbookLinks({ compact = false }: { compact?: boolean }) {
  const books = useLiveQuery(() => db.textbooks.orderBy('title').toArray(), [])
  if (books && !books.length)
    return (
      <EmptyState
        icon={BookOpen}
        title="No textbooks yet"
        description="Textbooks you add in the planner (with their digital-textbook links) appear here."
        action={
          <ButtonLink to="/textbooks" icon={BookOpen}>
            Open textbooks
          </ButtonLink>
        }
      />
    )
  if (compact)
    return (
      <ul className="w-72 max-w-full space-y-0.5">
        {books?.map((b) => (
          <li key={b.id} className="group flex items-center gap-2.5 rounded-lg p-1.5 hover:bg-slate-50">
            <TextbookCover book={b} className="w-9 shrink-0 rounded-md text-[10px]" />
            <span className="min-w-0 flex-1">
              {b.digitalUrl ? (
                <a
                  href={b.digitalUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="block truncate text-sm font-bold text-slate-700 hover:text-accent"
                  title="Open the digital textbook"
                >
                  {b.title}
                </a>
              ) : (
                <span className="block truncate text-sm font-bold text-slate-700">{b.title}</span>
              )}
              <span className="flex gap-2 text-[11px] font-semibold">
                {b.digitalUrl && <span className="text-accent">Digital textbook</span>}
                {b.altopediaUrl && (
                  <a href={b.altopediaUrl} target="_blank" rel="noreferrer" className="text-slate-500 hover:text-accent">
                    ALTopedia
                  </a>
                )}
                {!b.digitalUrl && (
                  <Link to={`/textbooks/${b.id}`} className="text-slate-500 hover:text-accent">
                    Add a link
                  </Link>
                )}
              </span>
            </span>
            {b.digitalUrl && <ExternalLink size={14} className="shrink-0 text-slate-300 group-hover:text-accent" aria-hidden />}
          </li>
        ))}
      </ul>
    )
  return (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
      {books?.map((b) => (
        <li key={b.id} className="flex flex-col gap-2 rounded-2xl bg-surface p-2 shadow-sm ring-1 ring-line">
          <Link to={`/textbooks/${b.id}`} className="block" title="Open in the planner">
            <TextbookCover book={b} className="mx-auto w-full max-w-32" />
          </Link>
          <span className="line-clamp-2 px-0.5 text-xs leading-tight font-bold">{b.title}</span>
          <div className="mt-auto flex flex-col gap-1">
            {b.digitalUrl && (
              <ButtonLink href={b.digitalUrl} size="sm" variant="primary" iconRight={ExternalLink} className="w-full">
                Digital
              </ButtonLink>
            )}
            {b.altopediaUrl && (
              <ButtonLink href={b.altopediaUrl} size="sm" variant="ghost" iconRight={ExternalLink} className="w-full">
                ALTopedia
              </ButtonLink>
            )}
            {/^nh[123]-/.test(b.preset ?? '') && (
              <ButtonLink to={`/jhs?book=${b.preset!.split('-')[0]}`} size="sm" variant="subtle" icon={GraduationCap} className="w-full">
                JHS
              </ButtonLink>
            )}
          </div>
        </li>
      ))}
    </ul>
  )
}
