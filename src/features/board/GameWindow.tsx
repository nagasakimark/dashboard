import { lazy, Suspense, useEffect, useState } from 'react'
import { Maximize2, Minimize2 } from 'lucide-react'
import { Spinner } from '@/components/ui'
import { cn } from '@/lib/cn'

const GamesPage = lazy(() => import('@/features/games/GamesPage'))
const JhsPage = lazy(() => import('@/features/jhs/JhsPage'))

/**
 * Games and JHS mode in a window over the board (the board stays visible
 * around it), instead of taking over the whole screen. Can be maximised.
 */
export function GameWindow({
  kind,
  onClose,
  toGames,
  toJhs,
}: {
  kind: 'games' | 'jhs'
  onClose: () => void
  toGames: (set?: string) => void
  toJhs: () => void
}) {
  const [max, setMax] = useState(false)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !document.querySelector('dialog[open]') && !document.fullscreenElement) onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-[9700]">
      <button
        type="button"
        tabIndex={-1}
        aria-hidden
        className="absolute inset-0 animate-fade-in cursor-default bg-slate-950/35 backdrop-blur-[3px]"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal
        aria-label={kind === 'jhs' ? 'JHS Classroom Mode' : 'Games'}
        className={cn(
          'absolute animate-pop-in overflow-hidden bg-white shadow-2xl ring-1 ring-black/10 transition-[inset,border-radius] duration-200',
          max ? 'inset-0 rounded-none' : 'inset-2 rounded-2xl sm:inset-x-[3vw] sm:top-[3vh] sm:bottom-[3vh] sm:rounded-[1.6rem]',
        )}
      >
        <Suspense
          fallback={
            <div className="grid h-full place-items-center">
              <Spinner />
            </div>
          }
        >
          {kind === 'jhs' ? <JhsPage embedded={{ onClose, toGames }} /> : <GamesPage embedded={{ onClose, toJhs }} />}
        </Suspense>
        <button
          type="button"
          onClick={() => setMax((m) => !m)}
          aria-label={max ? 'Restore window size' : 'Maximise window'}
          title={max ? 'Restore' : 'Maximise'}
          className="absolute right-2 bottom-2 z-10 grid size-9 place-items-center rounded-xl bg-white/80 text-slate-500 shadow-sm ring-1 ring-slate-200 backdrop-blur hover:text-slate-900"
        >
          {max ? <Minimize2 size={16} aria-hidden /> : <Maximize2 size={16} aria-hidden />}
        </button>
      </div>
    </div>
  )
}
