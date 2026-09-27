import { createContext, useContext, type ReactNode } from 'react'

export type ToastTone = 'info' | 'success' | 'error'

export interface ToastAction {
  label: string
  onClick: () => void
}

export interface ConfirmOptions {
  title: string
  message?: ReactNode
  confirmLabel?: string
  cancelLabel?: string
  danger?: boolean
}

export interface FeedbackApi {
  toast: (message: ReactNode, opts?: { tone?: ToastTone; action?: ToastAction; duration?: number }) => void
  confirm: (opts: ConfirmOptions) => Promise<boolean>
}

export const FeedbackContext = createContext<FeedbackApi | null>(null)

/** Toasts and confirm dialogs; requires <FeedbackProvider> above. */
export function useFeedback() {
  const ctx = useContext(FeedbackContext)
  if (!ctx) throw new Error('useFeedback must be used inside <FeedbackProvider>')
  return ctx
}
