import { type ReactNode } from 'react'
import { useLocation } from 'react-router'
import { RefreshCw, TriangleAlert } from 'lucide-react'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { Button, ButtonLink } from '@/components/ui'
import { errorReport } from '@/lib/errorLog'

/**
 * Catches a page's failure inside the app frame: the sidebar stays, other
 * pages keep working, and the page can be retried or left. Resets when you
 * navigate elsewhere.
 */
export function PageBoundary({ children }: { children: ReactNode }) {
  const { pathname } = useLocation()
  return (
    <ErrorBoundary
      key={pathname}
      where="page"
      fallback={(error, reset) => (
        <div className="grid min-h-[60dvh] place-items-center p-6">
          <div className="max-w-md text-center">
            <span className="mx-auto mb-4 grid size-14 place-items-center rounded-2xl bg-danger/10 text-danger">
              <TriangleAlert size={26} aria-hidden />
            </span>
            <h1 className="text-xl font-bold">This page hit a problem</h1>
            <p className="mt-2 text-sm text-ink-soft">Your data is safe. Try again, or go back home.</p>
            <pre className="mt-4 max-h-32 overflow-auto rounded-xl bg-ink/5 p-3 text-left text-xs whitespace-pre-wrap text-ink-soft">
              {error.message}
            </pre>
            <div className="mt-5 flex flex-wrap justify-center gap-2">
              <Button variant="primary" icon={RefreshCw} onClick={reset}>
                Try again
              </Button>
              <ButtonLink to="/">Go home</ButtonLink>
              <Button variant="ghost" onClick={() => void navigator.clipboard?.writeText(errorReport())}>
                Copy details
              </Button>
            </div>
          </div>
        </div>
      )}
    >
      {children}
    </ErrorBoundary>
  )
}
