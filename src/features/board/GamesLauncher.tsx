import { Gamepad2, GraduationCap, Library } from 'lucide-react'
import { groupCover } from '@/features/games/data'
import { JHS_BOOKS, jhsCover } from '@/features/jhs/data'

const BOOKS = ["Let's Try 1", "Let's Try 2", 'New Horizon 5', 'New Horizon 6']

export type GameTarget = { play: 'games'; group?: string } | { play: 'jhs'; book?: string }

const tile =
  'group flex flex-col items-center gap-1.5 rounded-xl p-1.5 text-center transition-colors hover:bg-slate-50 focus-visible:bg-slate-50'

/** The Games panel: jump straight to a textbook's word games, all word sets, or a JHS book. */
export function GamesLauncher({ open }: { open: (t: GameTarget) => void }) {
  return (
    <div className="w-[min(30rem,calc(100vw-3rem))] space-y-4">
      <section>
        <h3 className="mb-2 flex items-center gap-1.5 text-[11px] font-black tracking-[0.16em] text-slate-500 uppercase">
          <Gamepad2 size={13} className="text-accent" aria-hidden /> Elementary word games
        </h3>
        <div className="grid grid-cols-5 gap-1">
          {BOOKS.map((g) => (
            <button key={g} type="button" className={tile} onClick={() => open({ play: 'games', group: g })}>
              <img src={groupCover(g)} alt="" className="aspect-[3/4] w-full rounded-lg object-cover shadow-sm ring-1 ring-slate-200" />
              <span className="text-[11px] leading-tight font-bold text-slate-700 group-hover:text-accent">{g}</span>
            </button>
          ))}
          <button type="button" className={tile} onClick={() => open({ play: 'games' })}>
            <span className="grid aspect-[3/4] w-full place-items-center rounded-lg bg-accent-soft text-accent ring-1 ring-slate-200">
              <Library size={26} aria-hidden />
            </span>
            <span className="text-[11px] leading-tight font-bold text-slate-700 group-hover:text-accent">All word sets</span>
          </button>
        </div>
      </section>
      <section>
        <h3 className="mb-2 flex items-center gap-1.5 text-[11px] font-black tracking-[0.16em] text-slate-500 uppercase">
          <GraduationCap size={13} className="text-emerald-600" aria-hidden /> JHS Classroom Mode
        </h3>
        <div className="grid grid-cols-5 gap-1">
          {JHS_BOOKS.map((b) => (
            <button key={b.id} type="button" className={tile} onClick={() => open({ play: 'jhs', book: b.id })}>
              <img src={jhsCover(b.id)} alt="" className="aspect-[3/4] w-full rounded-lg object-cover shadow-sm ring-1 ring-slate-200" />
              <span className="text-[11px] leading-tight font-bold text-slate-700 group-hover:text-emerald-700">{b.title}</span>
            </button>
          ))}
        </div>
      </section>
    </div>
  )
}
