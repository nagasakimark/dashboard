import { Suspense, lazy } from 'react'
import { createHashRouter, Navigate, RouterProvider } from 'react-router'
import { FeedbackProvider, Spinner } from '@/components/ui'
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

const router = createHashRouter([
  {
    path: '/board',
    element: page(() => import('@/features/board/BoardPage')),
    errorElement: <RouteError />,
  },
  {
    element: <AppShell />,
    errorElement: <RouteError />,
    children: [
      { index: true, element: page(() => import('@/features/home/HomePage')) },
      { path: 'schedule', element: page(() => import('@/features/schedule/SchedulePage')) },
      { path: 'lessons', element: page(() => import('@/features/lessons/LessonsPage')) },
      { path: 'curriculum', element: page(() => import('@/features/curriculum/CurriculumPage')) },
      { path: 'textbooks', element: page(() => import('@/features/textbooks/TextbooksPage')) },
      { path: 'history', element: page(() => import('@/features/history/HistoryPage')) },
      { path: 'schools', element: page(() => import('@/features/schools/SchoolsPage')) },
      { path: 'settings', element: page(() => import('@/features/settings/SettingsPage')) },
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
])

export default function App() {
  return (
    <FeedbackProvider>
      <RouterProvider router={router} />
      <PwaPrompts />
    </FeedbackProvider>
  )
}
