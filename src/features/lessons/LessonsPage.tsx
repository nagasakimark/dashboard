import { NotebookPen } from 'lucide-react'
import { ComingSoon } from '@/components/layout/ComingSoon'

export default function LessonsPage() {
  return (
    <ComingSoon
      title="Lesson plans"
      icon={NotebookPen}
      phase={5}
      description="Your lesson plan library with a rich editor, resources, tags and printable layouts."
    />
  )
}
