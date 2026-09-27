import { useEffect, useRef, useState } from 'react'

/**
 * Local editing state for a value that is persisted elsewhere (IndexedDB).
 * Typing updates the draft immediately and commits after a short pause, so
 * keystrokes never race with database round-trips. External changes are
 * picked up whenever there's no pending edit.
 */
export function useDraft<T>(value: T, commit: (v: T) => unknown, delay = 400) {
  const [draft, setDraft] = useState(value)
  const pending = useRef<ReturnType<typeof setTimeout> | null>(null)
  const latest = useRef({ draft, commit })
  latest.current = { draft, commit }

  useEffect(() => {
    if (!pending.current) setDraft(value)
  }, [value])

  // Flush on unmount so nothing typed is lost when navigating away.
  useEffect(
    () => () => {
      if (pending.current) {
        clearTimeout(pending.current)
        latest.current.commit(latest.current.draft)
      }
    },
    [],
  )

  const update = (next: T) => {
    setDraft(next)
    if (pending.current) clearTimeout(pending.current)
    pending.current = setTimeout(() => {
      pending.current = null
      commit(next)
    }, delay)
  }

  /** Commit immediately (e.g. on blur) if an edit is pending. */
  const flush = () => {
    if (!pending.current) return
    clearTimeout(pending.current)
    pending.current = null
    commit(latest.current.draft)
  }

  return [draft, update, flush] as const
}
