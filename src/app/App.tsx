import { Suspense, lazy } from 'react'
import { createHashRouter, Navigate, RouterProvider } from 'react-router'
import { FeedbackProvider, Spinner } from '@/components/ui'
import { useApplyAppearance } from '@/data/settings'
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
      <RouterProvider router={router} />
      <PwaPrompts />
    </FeedbackProvider>
  )
}
