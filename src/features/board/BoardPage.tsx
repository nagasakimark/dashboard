import { Link } from 'react-router'
import { ArrowLeft, Presentation } from 'lucide-react'

/** Classroom board (full-screen). Rebuilt in phase 8. */
export default function BoardPage() {
  return (
    <div className="relative grid h-dvh place-items-center overflow-hidden bg-[linear-gradient(135deg,#667eea_0%,#764ba2_100%)] p-6 text-white">
      <Link
        to="/"
        className="absolute top-4 left-4 flex items-center gap-2 rounded-xl bg-white/15 px-3 py-2 text-sm font-semibold backdrop-blur hover:bg-white/25"
      >
        <ArrowLeft size={16} aria-hidden /> Planner
      </Link>
      <div className="max-w-md text-center">
        <span className="mx-auto mb-4 grid size-16 place-items-center rounded-3xl bg-white/15 backdrop-blur">
          <Presentation size={30} aria-hidden />
        </span>
        <h1 className="text-2xl font-bold">Classroom board</h1>
        <p className="mt-2 text-white/80">Workspaces and all 16 widgets arrive in phase 8.</p>
      </div>
    </div>
  )
}
