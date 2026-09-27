import { Link } from 'react-router'
import { useLiveQuery } from 'dexie-react-hooks'
import { BookOpen, ExternalLink, GraduationCap } from 'lucide-react'
import { ButtonLink, EmptyState } from '@/components/ui'
import { db } from '@/data/db'
import { TextbookCover } from '@/features/textbooks/TextbookCover'

/** The planner's textbooks with their digital-textbook and ALTopedia links. */
export function TextbookLinks() {
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
