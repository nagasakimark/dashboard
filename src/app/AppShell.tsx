import { useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router'
import { MoreHorizontal } from 'lucide-react'
import { Dialog } from '@/components/ui'
import { cn } from '@/lib/cn'
import { SyncBadge } from '@/features/sync/SyncBadge'
import { boardNav, plannerNav, type NavItem } from './nav'

export function AppShell() {
  return (
    <div className="flex min-h-dvh">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col pb-[calc(4.25rem+env(safe-area-inset-bottom))] md:pb-0">
        <main className="flex-1">
          <Outlet />
        </main>
      </div>
      <BottomBar />
    </div>
  )
}

function Logo({ compact }: { compact?: boolean }) {
  return (
    <Link to="/" className="flex items-center gap-2.5 rounded-xl px-1 py-1" aria-label="ALT Dashboard home">
      <img src={`${import.meta.env.BASE_URL}favicon.svg`} alt="" className="size-9 shrink-0 rounded-xl shadow-sm" />
      {!compact && (
        <span className="leading-tight">
          <span className="block text-[15px] font-bold tracking-tight text-ink">ALT Dashboard</span>
          <span className="block text-xs text-ink-faint">Planner &amp; classroom</span>
        </span>
      )}
    </Link>
  )
}

const itemClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    'group flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors',
    isActive ? 'bg-accent-soft text-accent-strong' : 'text-ink-soft hover:bg-ink/5 hover:text-ink',
  )

/** Sidebar on desktop (lg+), icon rail on tablets (md). Hidden on phones. */
function Sidebar() {
  return (
    <aside className="sticky top-0 hidden h-dvh w-[4.5rem] shrink-0 flex-col border-r border-line bg-surface/80 px-3 py-4 backdrop-blur md:flex lg:w-64">
      <div className="lg:hidden">
        <Logo compact />
      </div>
      <div className="hidden lg:block">
        <Logo />
      </div>

      <Link
        to={boardNav.to}
        className="mt-5 flex items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-accent to-cyan-500 px-3 py-2.5 text-sm font-semibold text-white shadow-md shadow-accent/25 transition-transform hover:scale-[1.02] active:scale-[0.98] lg:justify-start"
        title={boardNav.label}
      >
        <boardNav.icon size={19} aria-hidden />
        <span className="hidden lg:inline">{boardNav.label}</span>
      </Link>

      <nav aria-label="Main" className="mt-5 flex flex-1 flex-col gap-0.5">
        {plannerNav.map((item) => (
          <NavLink key={item.to} to={item.to} end={item.to === '/'} className={itemClass} title={item.label}>
            <item.icon size={19} aria-hidden className="shrink-0" />
            <span className="hidden lg:inline">{item.label}</span>
          </NavLink>
        ))}
      </nav>
      <SyncBadge className="hidden lg:flex" />
      <SyncBadge compact className="justify-center lg:hidden" />
    </aside>
  )
}

/** Phone bottom tab bar: primary destinations + board + "More". */
function BottomBar() {
  const [moreOpen, setMoreOpen] = useState(false)
  const { pathname } = useLocation()
  const primary = plannerNav.filter((n) => n.primary)
  const secondary = plannerNav.filter((n) => !n.primary)
  const moreActive = secondary.some((n) => pathname.startsWith(n.to))

  const tab = (item: NavItem) => (
    <NavLink
      key={item.to}
      to={item.to}
      end={item.to === '/'}
      className={({ isActive }) =>
        cn('flex flex-1 flex-col items-center gap-0.5 pt-2 pb-1.5 text-[11px] font-medium', isActive ? 'text-accent' : 'text-ink-faint')
      }
    >
      <item.icon size={22} aria-hidden />
      {item.short ?? item.label}
    </NavLink>
  )

  return (
    <>
      <nav
        aria-label="Main"
        className="safe-bottom fixed inset-x-0 bottom-0 z-40 flex border-t border-line bg-surface/95 backdrop-blur md:hidden"
      >
        {primary.map(tab)}
        {tab(boardNav)}
        <button
          type="button"
          onClick={() => setMoreOpen(true)}
          className={cn(
            'flex flex-1 flex-col items-center gap-0.5 pt-2 pb-1.5 text-[11px] font-medium',
            moreActive ? 'text-accent' : 'text-ink-faint',
          )}
        >
          <MoreHorizontal size={22} aria-hidden />
          More
        </button>
      </nav>

      <Dialog open={moreOpen} onClose={() => setMoreOpen(false)} title="More">
        <SyncBadge className="mb-2 -ml-3" />
        <div className="grid grid-cols-2 gap-2 pb-2">
          {secondary.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={() => setMoreOpen(false)}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-2xl border px-4 py-3.5 text-sm font-semibold',
                  isActive ? 'border-accent/30 bg-accent-soft text-accent-strong' : 'border-line text-ink',
                )
              }
            >
              <item.icon size={20} aria-hidden />
              {item.label}
            </NavLink>
          ))}
        </div>
      </Dialog>
    </>
  )
}
