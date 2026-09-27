import { Settings } from 'lucide-react'
import { ComingSoon } from '@/components/layout/ComingSoon'

export default function SettingsPage() {
  return (
    <ComingSoon title="Settings" icon={Settings} phase={2} description="Profile, appearance, data export and import, backups and sync." />
  )
}
