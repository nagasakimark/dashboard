import { Link } from 'react-router'
import { formatDistanceToNowStrict } from 'date-fns'
import { Cloud, CloudAlert, CloudOff, RefreshCw } from 'lucide-react'
import { cn } from '@/lib/cn'
import { useSync } from './context'

/** Sync status (synced / syncing / offline / error). Hidden while sync is off. */
export function SyncBadge({ compact = false, className }: { compact?: boolean; className?: string }) {
  const { enabled, status, account } = useSync()
  if (!enabled) return null
  const { state } = status
  const Icon =
    state === 'syncing'
      ? RefreshCw
      : state === 'offline'
        ? CloudOff
        : state === 'error' || (!account && state === 'idle')
          ? CloudAlert
          : Cloud
  const label =
    state === 'syncing'
      ? 'Syncing…'
      : state === 'offline'
        ? 'Offline — changes will sync later'
        : state === 'error'
          ? 'Sync problem'
          : !account
            ? 'Sign in to sync'
            : status.lastSyncedAt
              ? `Synced ${formatDistanceToNowStrict(status.lastSyncedAt, { addSuffix: true })}`
              : 'Synced'
  return (
    <Link
      to="/settings#sync"
      title={label}
      aria-label={`Sync: ${label}`}
      className={cn(
        'flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium transition-colors hover:bg-ink/5',
        state === 'error' ? 'text-danger' : state === 'offline' ? 'text-warning' : 'text-ink-soft',
        className,
      )}
    >
      <Icon size={17} aria-hidden className={cn('shrink-0', state === 'syncing' && 'animate-spin')} />
      {!compact && <span className="truncate">{label}</span>}
    </Link>
  )
}
