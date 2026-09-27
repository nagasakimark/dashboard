import { Dialog } from '@/components/ui'
import { CATEGORIES, WIDGET_META } from './model'
import { WIDGETS } from './registry'

export function AddWidgetDialog({ open, onClose, onAdd }: { open: boolean; onClose: () => void; onAdd: (type: string) => void }) {
  return (
    <Dialog open={open} onClose={onClose} title="Add widget" description="Widgets keep their settings in this workspace." size="lg">
      <div className="space-y-5">
        {CATEGORIES.map((cat) => {
          const items = WIDGET_META.filter((m) => m.category === cat.id)
          if (!items.length) return null
          return (
            <section key={cat.id}>
              <h3 className="mb-2 text-xs font-semibold tracking-wide text-ink-soft uppercase">{cat.label}</h3>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {items.map((m) => {
                  const Icon = WIDGETS.get(m.type)!.icon
                  return (
                    <button
                      key={m.type}
                      type="button"
                      onClick={() => {
                        onAdd(m.type)
                        onClose()
                      }}
                      className="flex items-start gap-2.5 rounded-xl border border-line bg-surface p-3 text-left transition-colors hover:border-accent-muted hover:bg-accent-soft/50"
                    >
                      <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-accent-soft text-accent">
                        <Icon size={18} aria-hidden />
                      </span>
                      <span className="min-w-0">
                        <span className="block text-sm font-semibold text-ink">{m.type}</span>
                        <span className="block text-xs text-ink-soft">{m.description}</span>
                      </span>
                    </button>
                  )
                })}
              </div>
            </section>
          )
        })}
      </div>
    </Dialog>
  )
}
