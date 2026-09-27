import { Vote } from 'lucide-react'
import { studentRoomParam } from '@/app/routes'

/** Student poll join page. Rebuilt in phase 9. */
export default function StudentApp() {
  const room = studentRoomParam(window.location)
  return (
    <div className="grid min-h-dvh place-items-center bg-gradient-to-br from-indigo-50 to-cyan-50 p-6">
      <div className="w-full max-w-sm rounded-3xl bg-white p-8 text-center shadow-pop">
        <span className="mx-auto mb-4 grid size-14 place-items-center rounded-2xl bg-accent-soft text-accent">
          <Vote size={26} aria-hidden />
        </span>
        <h1 className="text-xl font-bold">Join a poll</h1>
        <p className="mt-2 text-sm text-ink-soft">{room ? `Room ${room}. ` : ''}Live polls move to the new dashboard in phase 9.</p>
      </div>
    </div>
  )
}
