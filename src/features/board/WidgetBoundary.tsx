import type { ReactNode } from 'react'
import { RefreshCw, Trash2, TriangleAlert } from 'lucide-react'
import { ErrorBoundary } from '@/components/ErrorBoundary'

/** A widget that fails shows a small message with Retry/Close; the rest of the board keeps working. */
export function WidgetBoundary({ type, remove, children }: { type: string; remove: () => void; children: ReactNode }) {
  return (
    <ErrorBoundary
      where={`widget ${type}`}
      fallback={(error, reset) => (
        <div role="alert" className="grid h-full place-items-center p-3 text-center">
          <div className="max-w-xs">
            <TriangleAlert size={22} className="mx-auto text-danger" aria-hidden />
            <p className="mt-1 text-sm font-semibold text-ink">{type} hit a problem</p>
            <p className="mt-0.5 line-clamp-2 text-xs text-ink-soft">{error.message}</p>
            <div className="mt-2 flex justify-center gap-1.5">
              <button
                type="button"
                onClick={reset}
                className="inline-flex h-7 items-center gap-1 rounded-lg bg-accent-soft px-2 text-xs font-semibold text-accent-strong"
              >
                <RefreshCw size={12} aria-hidden /> Retry
              </button>
              <button
                type="button"
                onClick={remove}
                className="inline-flex h-7 items-center gap-1 rounded-lg px-2 text-xs font-semibold text-danger hover:bg-danger/10"
              >
                <Trash2 size={12} aria-hidden /> Close
              </button>
            </div>
          </div>
        </div>
      )}
    >
      {children}
    </ErrorBoundary>
  )
}
