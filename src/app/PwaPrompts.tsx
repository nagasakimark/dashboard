import { useEffect } from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'
import { useFeedback } from '@/components/ui'

/** Registers the service worker and offers updates / offline-ready notices. */
export function PwaPrompts() {
  const { toast } = useFeedback()
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    offlineReady: [offlineReady, setOfflineReady],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_url, registration) {
      // Check for a new version hourly while the app stays open all day.
      if (registration) setInterval(() => registration.update().catch(() => {}), 60 * 60 * 1000)
    },
  })

  useEffect(() => {
    if (!needRefresh) return
    toast('A new version of the dashboard is ready.', {
      duration: 60_000,
      action: { label: 'Update', onClick: () => updateServiceWorker(true) },
    })
    setNeedRefresh(false)
  }, [needRefresh, setNeedRefresh, toast, updateServiceWorker])

  useEffect(() => {
    if (!offlineReady) return
    toast('Ready to work offline.', { tone: 'success' })
    setOfflineReady(false)
  }, [offlineReady, setOfflineReady, toast])

  return null
}
