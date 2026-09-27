import { Image, LayoutTemplate, Layers, Users } from 'lucide-react'
import { Dialog, Tabs } from '@/components/ui'
import type { Roster, School, Widget, Workspace } from '@/data/schema'
import { BackgroundPanel } from './BackgroundPanel'
import type { BoardSettingsTab } from './context'
import { RostersPanel } from './RostersPanel'
import { TemplatesPanel } from './TemplatesPanel'
import { WorkspacesPanel } from './WorkspacesPanel'

interface Props {
  tab: BoardSettingsTab | null
  setTab: (tab: BoardSettingsTab | null) => void
  workspaces: Workspace[]
  active: Workspace
  widgets: Widget[]
  select: (id: string) => void
  setWidgets: (fn: (list: Widget[]) => Widget[]) => void
  rosters: Roster[]
  schools: School[]
}

export function BoardSettingsDialog({ tab, setTab, workspaces, active, widgets, select, setWidgets, rosters, schools }: Props) {
  return (
    <Dialog open={tab !== null} onClose={() => setTab(null)} title="Board settings" size="lg">
      <Tabs<BoardSettingsTab>
        label="Board settings"
        value={tab ?? 'workspaces'}
        onChange={setTab}
        className="mb-4"
        items={[
          { id: 'workspaces', label: 'Workspaces', icon: Layers, count: workspaces.length },
          { id: 'templates', label: 'Templates', icon: LayoutTemplate },
          { id: 'classes', label: 'Classes', icon: Users, count: rosters.length },
          { id: 'background', label: 'Background', icon: Image },
        ]}
      />
      {tab === 'workspaces' && (
        <WorkspacesPanel workspaces={workspaces} active={active} widgets={widgets} select={select} setWidgets={setWidgets} />
      )}
      {tab === 'templates' && <TemplatesPanel active={active} widgets={widgets} setWidgets={setWidgets} />}
      {tab === 'classes' && <RostersPanel rosters={rosters} schools={schools} />}
      {tab === 'background' && <BackgroundPanel workspace={active} />}
    </Dialog>
  )
}
