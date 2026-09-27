import { Suspense, lazy, useEffect } from 'react'
import { createHashRouter, Navigate, RouterProvider } from 'react-router'
import { FeedbackProvider, Spinner } from '@/components/ui'
import { useApplyAppearance } from '@/data/settings'
import { SyncProvider } from '@/features/sync/SyncProvider'
import { AppShell } from './AppShell'
import { PwaPrompts } from './PwaPrompts'
import { RouteError } from './RouteError'

const page = (load: () => Promise<{ default: React.ComponentType }>) => {
  const Component = lazy(load)
  return (
    <Suspense
      fallback={
        <div className="grid h-64 place-items-center">
          <Spinner />
        </div>
      }
    >
      <Component />
    </Suspense>
  )
}

function ReloadForStudent() {
  useEffect(() => window.location.reload(), [])
  return null
}

const router = createHashRouter([
  {
    path: '/print/lessons',
    element: page(() => import('@/features/lessons/LessonPrintPage')),
    errorElement: <RouteError />,
  },
  {
    path: '/board',
    element: page(() => import('@/features/board/BoardPage')),
    errorElement: <RouteError />,
  },
  {
    // The student page is a separate bundle chosen at load (see main.tsx):
    // reload when it's reached from inside the app.
    path: '/student',
    element: <ReloadForStudent />,
  },
  {
    path: '/games',
    element: page(() => import('@/features/games/GamesPage')),
    errorElement: <RouteError />,
  },
  {
    path: '/jhs',
    element: page(() => import('@/features/jhs/JhsPage')),
    errorElement: <RouteError />,
  },
  {
    element: <AppShell />,
    errorElement: <RouteError />,
    children: [
      { index: true, element: page(() => import('@/features/home/HomePage')) },
      { path: 'schedule', element: page(() => import('@/features/schedule/SchedulePage')) },
      { path: 'lessons', element: page(() => import('@/features/lessons/LessonsPage')) },
      { path: 'lessons/:id', element: page(() => import('@/features/lessons/LessonEditorPage')) },
      { path: 'curriculum', element: page(() => import('@/features/curriculum/CurriculumPage')) },
      { path: 'curriculum/:id', element: page(() => import('@/features/curriculum/CurriculumDetailPage')) },
      { path: 'textbooks', element: page(() => import('@/features/textbooks/TextbooksPage')) },
      { path: 'textbooks/:id', element: page(() => import('@/features/textbooks/TextbookDetailPage')) },
      { path: 'history', element: page(() => import('@/features/history/HistoryPage')) },
      { path: 'links', element: page(() => import('@/features/links/LinksPage')) },
      { path: 'help', element: page(() => import('@/features/help/HelpPage')) },
      { path: 'schools', element: page(() => import('@/features/schools/SchoolsPage')) },
      { path: 'settings', element: page(() => import('@/features/settings/SettingsPage')) },
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
])

export default function App() {
  useApplyAppearance()
  return (
    <FeedbackProvider>
      <SyncProvider>
        <RouterProvider router={router} />
        <PwaPrompts />
      </SyncProvider>
    </FeedbackProvider>
  )
}
