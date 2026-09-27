import { ListChecks } from 'lucide-react'
import { ComingSoon } from '@/components/layout/ComingSoon'

export default function CurriculumPage() {
  return (
    <ComingSoon
      title="Curriculum"
      icon={ListChecks}
      phase={6}
      description="Curricula with optional links to textbook sections and per-class progress tracking."
    />
  )
}
