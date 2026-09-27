import { CalendarDays } from 'lucide-react'
import { ComingSoon } from '@/components/layout/ComingSoon'

export default function SchedulePage() {
  return (
    <ComingSoon
      title="Schedule"
      icon={CalendarDays}
      phase={4}
      description="Week, month and year calendars with drag-and-drop periods, tallies and the PDF report."
    />
  )
}
