import { useEffect } from 'react'
import { useFeedback } from '@/components/ui'
import { checkIntegrity } from '@/data/integrity'
import { requestPersistenceQuietly } from '@/data/storage'
import { runAutoBackup } from '@/data/transfer'
import { logError } from '@/lib/errorLog'

/**
 * Start-up protection for the user's data: notice a cleared database, ask the
 * browser to keep the storage, and take the daily automatic backup.
 */
export function DataSafeguards() {
  const { toast } = useFeedback()
  useEffect(() => {
    let off = false
    void (async () => {
      const { wiped } = await checkIntegrity()
      if (off) return
      if (wiped)
        toast(
          'This browser cleared the app’s stored data. Sign in under Settings → Sync to bring it back from your cloud copy, or import a backup file.',
          {
            tone: 'error',
            duration: 20000,
          },
        )
      requestPersistenceQuietly()
      // A little later, so start-up isn't slowed down.
      await new Promise((r) => setTimeout(r, 4000))
      if (!off && !wiped) await runAutoBackup().catch((e) => logError(e, 'auto backup'))
    })()
    return () => {
      off = true
    }
  }, [toast])
  return null
}
