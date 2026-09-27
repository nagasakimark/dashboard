import type { LucideIcon } from 'lucide-react'
import { Card, EmptyState } from '@/components/ui'
import { Page } from './Page'

/** Placeholder for sections that arrive in later phases of the overhaul. */
export function ComingSoon({ title, icon, phase, description }: { title: string; icon: LucideIcon; phase: number; description: string }) {
  return (
    <Page title={title}>
      <Card>
        <EmptyState icon={icon} title={`Coming in phase ${phase}`} description={description} />
      </Card>
    </Page>
  )
}
