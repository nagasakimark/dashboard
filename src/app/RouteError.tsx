import { isRouteErrorResponse, useRouteError } from 'react-router'
import { RefreshCw, TriangleAlert } from 'lucide-react'
import { Button, ButtonLink } from '@/components/ui'

/**
 * Shown when a page throws. Stale chunks after a deploy are the most common
 * cause for a PWA, so a reload is the primary action.
 */
export function RouteError() {
  const error = useRouteError()
  const message = isRouteErrorResponse(error)
    ? `${error.status} ${error.statusText}`
    : error instanceof Error
      ? error.message
      : 'Unknown error'
  return (
    <div className="grid min-h-dvh place-items-center p-6">
      <div className="max-w-md text-center">
        <span className="mx-auto mb-4 grid size-14 place-items-center rounded-2xl bg-danger/10 text-danger">
          <TriangleAlert size={26} aria-hidden />
        </span>
        <h1 className="text-xl font-bold">Something went wrong</h1>
        <p className="mt-2 text-sm text-ink-soft">Your data is safe. Reloading usually fixes this.</p>
        <pre className="mt-4 overflow-x-auto rounded-xl bg-ink/5 p-3 text-left text-xs text-ink-soft">{message}</pre>
        <div className="mt-5 flex justify-center gap-2">
          <Button variant="primary" icon={RefreshCw} onClick={() => window.location.reload()}>
            Reload
          </Button>
          <ButtonLink to="/">Go home</ButtonLink>
        </div>
      </div>
    </div>
  )
}
