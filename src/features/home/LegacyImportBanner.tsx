import { useState } from 'react'
import { DatabaseZap, X } from 'lucide-react'
import { Button, Card, IconButton } from '@/components/ui'
import { useSettings } from '@/data/settings'
import { ImportDialog } from '@/features/settings/ImportDialog'
import { useLegacyImport } from '@/features/settings/useLegacyImport'

/** Offers a one-click import of the old dashboard/planner data on this device. */
export function LegacyImportBanner() {
  const { settings, setSetting, loaded } = useSettings()
  const legacy = useLegacyImport()
  const [hidden, setHidden] = useState(false)

  if (!loaded || settings.legacyMigrationDone || !legacy.available || hidden) return null

  return (
    <>
      <Card className="mb-5 flex flex-col gap-4 border-accent/30 bg-gradient-to-br from-accent-soft to-surface p-4 sm:flex-row sm:items-center">
        <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-accent text-white shadow-sm">
          <DatabaseZap size={22} aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-ink">Bring over your data from the old dashboard</p>
          <p className="text-sm text-ink-soft">
            Your planner schedule, lesson plans, textbooks, curricula and board workspaces were found on this device. Review what will be
            imported before anything changes.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button variant="primary" onClick={legacy.review} disabled={legacy.loading}>
            {legacy.loading ? 'Reading…' : 'Review & import'}
          </Button>
          <IconButton icon={X} label="Not now" onClick={() => setHidden(true)} />
        </div>
      </Card>
      <ImportDialog
        plan={legacy.plan}
        onClose={legacy.close}
        title="Import from the old dashboard"
        confirmLabel="Import my data"
        onDone={() => setSetting('legacyMigrationDone', true)}
      />
    </>
  )
}
