import { useCallback, useMemo, useRef, useState, type ReactNode } from 'react'
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from 'lucide-react'
import { cn } from '@/lib/cn'
import { Button } from './Button'
import { Dialog } from './Dialog'
import { FeedbackContext, type ConfirmOptions, type FeedbackApi, type ToastAction, type ToastTone } from './useFeedback'

/* ---------------------------------------------------------------- toasts */

interface Toast {
  id: number
  message: ReactNode
  tone: ToastTone
  action?: ToastAction
}

const toneIcon = { info: Info, success: CheckCircle2, error: XCircle }
const toneColor = { info: 'text-accent', success: 'text-success', error: 'text-danger' }

export function FeedbackProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const [pending, setPending] = useState<(ConfirmOptions & { resolve: (v: boolean) => void }) | null>(null)
  const nextId = useRef(1)

  const dismiss = useCallback((id: number) => setToasts((t) => t.filter((x) => x.id !== id)), [])

  const toast = useCallback<FeedbackApi['toast']>(
    (message, opts = {}) => {
      const id = nextId.current++
      setToasts((t) => [...t.slice(-3), { id, message, tone: opts.tone ?? 'info', action: opts.action }])
      window.setTimeout(() => dismiss(id), opts.duration ?? (opts.action ? 7000 : 4000))
    },
    [dismiss],
  )

  const confirm = useCallback<FeedbackApi['confirm']>((opts) => new Promise<boolean>((resolve) => setPending({ ...opts, resolve })), [])

  const settle = (value: boolean) => {
    pending?.resolve(value)
    setPending(null)
  }

  const api = useMemo(() => ({ toast, confirm }), [toast, confirm])

  return (
    <FeedbackContext.Provider value={api}>
      {children}

      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-20 z-[100000] flex flex-col items-center gap-2 px-4 md:bottom-6 in-[[data-board]]:bottom-24!"
      >
        {toasts.map((t) => {
          const Icon = toneIcon[t.tone]
          return (
            <div
              key={t.id}
              role="status"
              className="pointer-events-auto flex w-full max-w-md animate-pop-in items-center gap-3 rounded-2xl bg-ink px-4 py-3 text-sm text-white shadow-pop"
            >
              <Icon size={18} className={cn('shrink-0', toneColor[t.tone], 'brightness-150')} aria-hidden />
              <div className="min-w-0 flex-1">{t.message}</div>
              {t.action && (
                <button
                  type="button"
                  onClick={() => {
                    t.action!.onClick()
                    dismiss(t.id)
                  }}
                  className="shrink-0 rounded-lg px-2 py-1 font-semibold text-accent-muted hover:bg-white/10"
                >
                  {t.action.label}
                </button>
              )}
              <button
                type="button"
                aria-label="Dismiss"
                onClick={() => dismiss(t.id)}
                className="shrink-0 rounded-lg p-1 text-white/60 hover:bg-white/10 hover:text-white"
              >
                <X size={16} />
              </button>
            </div>
          )
        })}
      </div>

      <Dialog
        open={!!pending}
        onClose={() => settle(false)}
        size="sm"
        title={
          <span className="flex items-center gap-2">
            {pending?.danger && <AlertTriangle size={20} className="text-danger" aria-hidden />}
            {pending?.title}
          </span>
        }
        footer={
          <>
            <Button variant="ghost" onClick={() => settle(false)}>
              {pending?.cancelLabel ?? 'Cancel'}
            </Button>
            <Button variant={pending?.danger ? 'danger' : 'primary'} onClick={() => settle(true)} autoFocus>
              {pending?.confirmLabel ?? 'Confirm'}
            </Button>
          </>
        }
      >
        {pending?.message && <div className="text-sm text-ink-soft">{pending.message}</div>}
      </Dialog>
    </FeedbackContext.Provider>
  )
}
