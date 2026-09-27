import { useState } from 'react'
import { Archive, ArchiveRestore, Clock, MoreVertical, Pencil, Plus, School as SchoolIcon, Trash2, Users } from 'lucide-react'
import { Page } from '@/components/layout/Page'
import { Badge, Button, Card, EmptyState, IconButton, Menu, Spinner, useFeedback } from '@/components/ui'
import { db } from '@/data/db'
import { patch, remove } from '@/data/repo'
import type { School } from '@/data/schema'
import { useSchools } from '@/features/schedule/hooks'
import { SchoolEditor } from './SchoolEditor'

export default function SchoolsPage() {
  const schools = useSchools()
  const { confirm, toast } = useFeedback()
  const [editing, setEditing] = useState<School | 'new' | null>(null)

  const onDelete = async (s: School) => {
    const days = await db.dayAssignments.where('schoolId').equals(s.id).count()
    const ok = await confirm({
      title: `Delete ${s.name}?`,
      message:
        days > 0
          ? `${days} scheduled day${days === 1 ? '' : 's'} use this school. They’ll show as “no school” but keep their periods. Archiving keeps everything instead.`
          : 'This can’t be undone (except by restoring a backup).',
      confirmLabel: 'Delete school',
      danger: true,
    })
    if (!ok) return
    await remove('schools', s.id)
    toast(`${s.name} deleted.`)
  }

  return (
    <Page
      title="Schools"
      description="Your schools, their classes, JTEs and timetables."
      actions={
        <Button variant="primary" icon={Plus} onClick={() => setEditing('new')}>
          <span className="hidden sm:inline">Add school</span>
          <span className="sm:hidden">Add</span>
        </Button>
      }
    >
      {!schools ? (
        <div className="grid h-40 place-items-center">
          <Spinner />
        </div>
      ) : schools.length === 0 ? (
        <Card>
          <EmptyState
            icon={SchoolIcon}
            title="No schools yet"
            description="Add the schools you visit. Each one gets a colour, its classes, JTEs and timetables."
            action={
              <Button variant="primary" icon={Plus} onClick={() => setEditing('new')}>
                Add your first school
              </Button>
            }
          />
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {schools.map((s) => {
            const years = [...new Set(s.classes.map((c) => c.year))].sort((a, b) => a - b)
            return (
              <Card key={s.id} className={s.archived ? 'opacity-60' : ''}>
                <div className="h-1.5 rounded-t-card" style={{ backgroundColor: s.color }} />
                <div className="flex items-start gap-3 p-4">
                  <span
                    className="grid size-11 shrink-0 place-items-center rounded-2xl text-lg font-bold text-white"
                    style={{ backgroundColor: s.color }}
                    aria-hidden
                  >
                    {s.name.slice(0, 1)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h2 className="truncate font-semibold text-ink">{s.name}</h2>
                      {s.archived && <Badge>Archived</Badge>}
                    </div>
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-ink-soft">
                      <span className="flex items-center gap-1.5">
                        <Users size={15} aria-hidden /> {s.classes.length} classes
                        {years.length > 0 && <span className="text-ink-faint">(years {years.join(', ')})</span>}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Clock size={15} aria-hidden /> {s.timetables.length} timetable{s.timetables.length === 1 ? '' : 's'}
                      </span>
                    </div>
                    {s.jtes.length > 0 && (
                      <p className="mt-1.5 truncate text-sm text-ink-faint">JTEs: {s.jtes.map((j) => j.name).join(', ')}</p>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center">
                    <IconButton icon={Pencil} label={`Edit ${s.name}`} size="sm" onClick={() => setEditing(s)} />
                    <Menu
                      trigger={(p) => <IconButton {...p} icon={MoreVertical} label="More actions" size="sm" />}
                      items={[
                        {
                          label: s.archived ? 'Unarchive' : 'Archive',
                          icon: s.archived ? ArchiveRestore : Archive,
                          onSelect: () => patch('schools', s.id, { archived: !s.archived }),
                        },
                        'divider',
                        { label: 'Delete', icon: Trash2, danger: true, onSelect: () => onDelete(s) },
                      ]}
                    />
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      )}

      {editing && <SchoolEditor school={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />}
    </Page>
  )
}
