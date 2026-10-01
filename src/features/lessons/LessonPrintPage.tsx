import { useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import { useLiveQuery } from 'dexie-react-hooks'
import { format } from 'date-fns'
import { ArrowLeft, Printer } from 'lucide-react'
import { RichTextView } from '@/components/editor/RichTextView'
import { Button, Spinner } from '@/components/ui'
import { db } from '@/data/db'
import { useSettings } from '@/data/settings'
import { pageRef } from '@/features/textbooks/format'

/** Clean A4 print layout for one or more lesson plans. */
export default function LessonPrintPage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const { settings } = useSettings()
  const ids = (params.get('ids') ?? '').split(',').filter(Boolean)
  const data = useLiveQuery(async () => {
    const plans = (await db.lessonPlans.bulkGet(ids)).filter((p): p is NonNullable<typeof p> => !!p)
    const [schools, books, sections] = await Promise.all([
      db.schools.bulkGet(plans.map((p) => p.schoolId ?? '')),
      db.textbooks.bulkGet(plans.map((p) => p.textbookId ?? '')),
      db.sections.bulkGet(plans.map((p) => p.sectionId ?? '')),
    ])
    return plans.map((plan, i) => ({ plan, school: schools[i], book: books[i], section: sections[i] }))
  }, [ids.join(',')])

  useEffect(() => {
    if (!data?.length) return
    const t = setTimeout(() => window.print(), 400)
    return () => clearTimeout(t)
  }, [data])

  if (!data)
    return (
      <div className="grid h-dvh place-items-center">
        <Spinner />
      </div>
    )

  const printed = format(new Date(), 'd MMM yyyy')
  return (
    <div className="min-h-dvh bg-canvas print:bg-white">
      <div className="sticky top-0 z-10 flex items-center gap-2 border-b border-line bg-surface/90 px-4 py-2 backdrop-blur print:hidden">
        <Button variant="ghost" icon={ArrowLeft} onClick={() => navigate(-1)}>
          Back
        </Button>
        <span className="text-sm text-ink-soft">
          {data.length} plan{data.length === 1 ? '' : 's'} · A4
        </span>
        <Button variant="primary" icon={Printer} className="ml-auto" onClick={() => window.print()}>
          Print or save as PDF
        </Button>
      </div>
      {data.map(({ plan, school, book, section }) => (
        <article
          key={plan.id}
          className="print-sheet mx-auto my-6 w-full max-w-[210mm] bg-white p-[16mm] shadow-card print:m-0 print:max-w-none print:p-0 print:shadow-none"
        >
          <header className="mb-5 border-b-2 pb-3" style={{ borderColor: school?.color ?? '#4f46e5' }}>
            <h1 className="text-2xl leading-tight font-bold text-ink">{plan.title || 'Untitled lesson'}</h1>
            <p className="mt-1 flex flex-wrap gap-x-3 text-sm text-ink-soft">
              {school && <span style={{ color: school.color }}>{school.name}</span>}
              {plan.year && <span>Year {plan.year}</span>}
              {book && (
                <span>
                  {book.title}
                  {section ? `, ${[pageRef(section.page), section.title].filter(Boolean).join(': ')}` : ''}
                </span>
              )}
              {(plan.tags?.length ?? 0) > 0 && <span>{(plan.tags ?? []).map((t) => `#${t}`).join(' ')}</span>}
            </p>
          </header>
          <RichTextView html={plan.content} />
          {(plan.resources?.length ?? 0) > 0 && (
            <section className="mt-6 border-t border-line pt-3">
              <h2 className="mb-1 text-sm font-bold text-ink">Resources</h2>
              <ul className="list-disc pl-5 text-sm">
                {(plan.resources ?? []).map((r) => (
                  <li key={r.id}>
                    {r.name}
                    {r.kind === 'link' && r.url && <span className="text-ink-faint"> — {r.url}</span>}
                  </li>
                ))}
              </ul>
            </section>
          )}
          <footer className="mt-8 text-xs text-ink-faint">
            {settings.profileName ? `${settings.profileName} · ` : ''}Printed {printed}
          </footer>
        </article>
      ))}
    </div>
  )
}
