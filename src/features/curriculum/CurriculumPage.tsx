import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { useLiveQuery } from 'dexie-react-hooks'
import { ListChecks, Plus } from 'lucide-react'
import { Page } from '@/components/layout/Page'
import { Badge, Button, Card, EmptyState, Spinner } from '@/components/ui'
import { db } from '@/data/db'
import { useSchools } from '@/features/schedule/hooks'
import { CurriculumEditor } from './CurriculumEditor'
import { classPosition, progressIndex, trackedClasses } from './model'

export default function CurriculumPage() {
  const navigate = useNavigate()
  const curricula = useLiveQuery(() => db.curricula.orderBy('name').toArray(), [])
  const items = useLiveQuery(() => db.curriculumItems.toArray(), [])
  const progress = useLiveQuery(() => db.classProgress.toArray(), [])
  const books = useLiveQuery(async () => new Map((await db.textbooks.toArray()).map((b) => [b.id, b])), [])
  const schools = useSchools()
  const [creating, setCreating] = useState(false)
  const index = useMemo(() => progressIndex(progress ?? []), [progress])

  return (
    <Page
      title="Curriculum"
      description="Plan what each class covers, and see where every class is up to."
      actions={
        <Button variant="primary" icon={Plus} onClick={() => setCreating(true)}>
          <span className="hidden sm:inline">New curriculum</span>
          <span className="sm:hidden">New</span>
        </Button>
      }
    >
      {!curricula || !items || !schools ? (
        <div className="grid h-40 place-items-center">
          <Spinner />
        </div>
      ) : curricula.length === 0 ? (
        <Card>
          <EmptyState
            icon={ListChecks}
            title="No curricula yet"
            description="A curriculum is an ordered list of what to teach — units, textbook pages or lessons. Build one from a textbook in a click, then tick off progress class by class."
            action={
              <Button variant="primary" icon={Plus} onClick={() => setCreating(true)}>
                Create a curriculum
              </Button>
            }
          />
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {curricula.map((c) => {
            const list = items.filter((i) => i.curriculumId === c.id).sort((a, b) => a.order - b.order)
            const classes = trackedClasses(c, schools)
            const done = classes.length
              ? classes.reduce((n, cl) => n + classPosition(list, index, cl.key).done, 0) / (classes.length * Math.max(1, list.length))
              : list.filter((i) => i.completed).length / Math.max(1, list.length)
            const school = schools.find((s) => s.id === c.schoolId)
            return (
              <Link key={c.id} to={`/curriculum/${c.id}`}>
                <Card className="h-full p-4 transition-[box-shadow,transform] hover:-translate-y-0.5 hover:shadow-pop">
                  <h2 className="font-semibold text-ink">{c.name}</h2>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {c.year && <Badge>Year {c.year}</Badge>}
                    {school && <Badge color={school.color}>{school.name}</Badge>}
                    {c.textbookId && books?.get(c.textbookId) && <Badge tone="accent">{books.get(c.textbookId)!.title}</Badge>}
                  </div>
                  <div className="mt-4 h-2 overflow-hidden rounded-full bg-ink/8">
                    <div className="h-full rounded-full bg-accent transition-[width]" style={{ width: `${Math.round(done * 100)}%` }} />
                  </div>
                  <p className="mt-1.5 text-xs text-ink-faint">
                    {list.length} items · {classes.length ? `${classes.length} classes · ` : ''}
                    {Math.round(done * 100)}% done
                  </p>
                </Card>
              </Link>
            )
          })}
        </div>
      )}
      {creating && (
        <CurriculumEditor curriculum={null} onClose={() => setCreating(false)} onCreated={(id) => navigate(`/curriculum/${id}`)} />
      )}
    </Page>
  )
}
