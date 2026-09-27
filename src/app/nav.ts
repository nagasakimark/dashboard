import {
  BookOpen,
  CalendarDays,
  History,
  House,
  ListChecks,
  NotebookPen,
  Presentation,
  School,
  Settings,
  type LucideIcon,
} from 'lucide-react'

export interface NavItem {
  to: string
  label: string
  /** Short label for the phone tab bar. */
  short?: string
  icon: LucideIcon
  /** Shown in the phone bottom bar (others go under "More"). */
  primary?: boolean
}

export const plannerNav: NavItem[] = [
  { to: '/', label: 'Home', icon: House, primary: true },
  { to: '/schedule', label: 'Schedule', icon: CalendarDays, primary: true },
  { to: '/lessons', label: 'Lesson plans', short: 'Lessons', icon: NotebookPen, primary: true },
  { to: '/curriculum', label: 'Curriculum', icon: ListChecks },
  { to: '/textbooks', label: 'Textbooks', icon: BookOpen },
  { to: '/history', label: 'Class history', icon: History },
  { to: '/schools', label: 'Schools', icon: School },
  { to: '/settings', label: 'Settings', icon: Settings },
]

export const boardNav: NavItem = { to: '/board', label: 'Classroom board', short: 'Board', icon: Presentation }
