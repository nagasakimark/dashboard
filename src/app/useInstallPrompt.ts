import { useEffect, useState } from 'react'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

let deferred: BeforeInstallPromptEvent | null = null
const listeners = new Set<() => void>()

// Capture the event as early as possible; it fires once per page load.
if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault()
    deferred = e as BeforeInstallPromptEvent
    listeners.forEach((l) => l())
  })
  window.addEventListener('appinstalled', () => {
    deferred = null
    listeners.forEach((l) => l())
  })
}

const isStandalone = () =>
  window.matchMedia?.('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone === true

/** Install-as-app support: whether it's available/installed and a trigger. */
export function useInstallPrompt() {
  const [, force] = useState(0)
  useEffect(() => {
    const l = () => force((n) => n + 1)
    listeners.add(l)
    return () => {
      listeners.delete(l)
    }
  }, [])
  return {
    installed: isStandalone(),
    canInstall: !!deferred,
    install: async () => {
      if (!deferred) return false
      await deferred.prompt()
      const { outcome } = await deferred.userChoice
      deferred = null
      force((n) => n + 1)
      return outcome === 'accepted'
    },
  }
}
