import { useCallback, useEffect, useState } from 'react'
import { legacyBrowserPlan, type ImportPlan } from '@/data/importFile'
import { hasLegacyContent, readLegacyBrowserData } from '@/data/migrate/browser'

/** Detects data left by the old dashboard/planner in this browser. */
export function useLegacyImport() {
  const [available, setAvailable] = useState(false)
  const [plan, setPlan] = useState<ImportPlan | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    let alive = true
    readLegacyBrowserData()
      .then((d) => alive && setAvailable(hasLegacyContent(d)))
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [])

  const review = useCallback(async () => {
    setLoading(true)
    try {
      setPlan(await legacyBrowserPlan(await readLegacyBrowserData()))
    } finally {
      setLoading(false)
    }
  }, [])

  return { available, plan, loading, review, close: () => setPlan(null) }
}
