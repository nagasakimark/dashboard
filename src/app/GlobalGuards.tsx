import { useEffect } from 'react'
import { useFeedback } from '@/components/ui'
import { logError } from '@/lib/errorLog'

const QUIET = /failed to fetch|networkerror|load failed|aborterror|resizeobserver|the user aborted|cancelled|canceled/i

/**
 * App-wide safety nets:
 * - a file dropped on the window would make the browser open it and leave the
 *   app (it looks like a crash), so drops are ignored except on elements
 *   marked data-file-drop, which handle files themselves;
 * - errors nobody caught are logged (see Help → Copy error details) and shown
 *   as a message instead of failing silently.
 */
export function GlobalGuards() {
  const { toast } = useFeedback()

  useEffect(() => {
    const hasFiles = (e: DragEvent) => !!e.dataTransfer?.types?.includes('Files')
    const zone = (e: Event) => (e.target instanceof Element ? e.target.closest('[data-file-drop]') : null)
    const over = (e: DragEvent) => {
      if (hasFiles(e) && !zone(e)) {
        e.preventDefault()
        if (e.dataTransfer) e.dataTransfer.dropEffect = 'none'
      }
    }
    const drop = (e: DragEvent) => {
      if (hasFiles(e) && !zone(e)) e.preventDefault()
    }
    window.addEventListener('dragover', over)
    window.addEventListener('drop', drop)

    let lastToast = 0
    const report = (reason: unknown, where: string) => {
      const message = reason instanceof Error ? reason.message : String(reason)
      logError(reason, where)
      if (QUIET.test(message) || Date.now() - lastToast < 5000) return
      lastToast = Date.now()
      toast(`Something didn’t work: ${message.slice(0, 140)}`, { tone: 'error', duration: 8000 })
    }
    const onRejection = (e: PromiseRejectionEvent) => report(e.reason, 'promise')
    const onError = (e: ErrorEvent) => e.error && report(e.error, 'error')
    window.addEventListener('unhandledrejection', onRejection)
    window.addEventListener('error', onError)
    return () => {
      window.removeEventListener('dragover', over)
      window.removeEventListener('drop', drop)
      window.removeEventListener('unhandledrejection', onRejection)
      window.removeEventListener('error', onError)
    }
  }, [toast])

  return null
}
