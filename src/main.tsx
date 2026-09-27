import { StrictMode, Suspense, lazy } from 'react'
import { createRoot } from 'react-dom/client'
import { isStudentRoute } from '@/app/routes'
// Direct import (not the ui barrel) keeps the router out of the entry chunk.
import { Spinner } from '@/components/ui/Card'
import './styles/index.css'
// Listen for the browser's install offer from the first moment: it fires once, early.
import '@/app/useInstallPrompt'

// Students joining a poll get a tiny standalone bundle; everyone else gets
// the full app. The student page must answer at /dashboard/student?room=…
// because that URL is printed in existing QR codes.
const Root = isStudentRoute(window.location) ? lazy(() => import('@/features/student/StudentApp')) : lazy(() => import('@/app/App'))

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Suspense
      fallback={
        <div className="grid h-dvh place-items-center">
          <Spinner className="size-7" />
        </div>
      }
    >
      <Root />
    </Suspense>
  </StrictMode>,
)
