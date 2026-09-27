import { Link } from 'react-router'
import { ArrowRight, CalendarDays, Gamepad2, NotebookPen, Presentation, Vote } from 'lucide-react'
import { Page } from '@/components/layout/Page'
import { Card } from '@/components/ui'

function greeting(date = new Date()) {
  const h = date.getHours()
  return h < 5 ? 'Good evening' : h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'
}

const shortcuts = [
  {
    to: '/board',
    label: 'Classroom board',
    text: 'Timers, name pickers, polls and more for the projector.',
    icon: Presentation,
    tint: 'from-indigo-500 to-cyan-500',
  },
  { to: '/schedule', label: 'Schedule', text: 'Plan your week across schools.', icon: CalendarDays, tint: 'from-emerald-500 to-teal-500' },
  {
    to: '/lessons',
    label: 'Lesson plans',
    text: 'Write, reuse and print lesson plans.',
    icon: NotebookPen,
    tint: 'from-amber-500 to-orange-500',
  },
  {
    to: '/board',
    label: 'Games & polls',
    text: 'Vocabulary games and live class polls.',
    icon: Gamepad2,
    tint: 'from-pink-500 to-rose-500',
  },
]

export default function HomePage() {
  const today = new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })
  return (
    <Page title={greeting()} description={today}>
      <div className="grid gap-4 sm:grid-cols-2">
        {shortcuts.map((s) => (
          <Link key={s.label} to={s.to} className="group">
            <Card className="flex h-full items-center gap-4 p-4 transition-[box-shadow,transform] group-hover:-translate-y-0.5 group-hover:shadow-pop">
              <span className={`grid size-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br text-white shadow-sm ${s.tint}`}>
                <s.icon size={24} aria-hidden />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-semibold text-ink">{s.label}</span>
                <span className="block text-sm text-ink-soft">{s.text}</span>
              </span>
              <ArrowRight size={18} className="text-ink-faint transition-transform group-hover:translate-x-0.5" aria-hidden />
            </Card>
          </Link>
        ))}
      </div>

      <Card className="mt-6 flex items-start gap-3 border-dashed p-4 text-sm text-ink-soft">
        <Vote size={18} className="mt-0.5 shrink-0 text-accent" aria-hidden />
        <p>
          This is the preview of the new ALT Dashboard. Sections fill in as each phase of the overhaul lands. Your existing dashboard at{' '}
          <span className="font-medium text-ink">/dashboard/</span> is untouched.
        </p>
      </Card>
    </Page>
  )
}
