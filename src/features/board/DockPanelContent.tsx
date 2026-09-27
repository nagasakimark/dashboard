import type { Workspace } from '@/data/schema'
import { LinkGrid } from '@/features/links/LinkGrid'
import { TextbookLinks } from '@/features/links/TextbookLinks'
import { BackgroundPanel } from './BackgroundPanel'
import type { DockPanel } from './BoardChrome'
import { GamesLauncher, type GameTarget } from './GamesLauncher'

/** What each dock panel shows (loaded when a panel first opens). */
export default function DockPanelContent({
  panel,
  workspace,
  openGame,
}: {
  panel: DockPanel
  workspace: Workspace
  openGame: (t: GameTarget) => void
}) {
  if (panel === 'textbooks') return <TextbookLinks compact />
  if (panel === 'activities') return <LinkGrid kind="activity" compact />
  if (panel === 'bookmarks') return <LinkGrid kind="bookmark" compact />
  if (panel === 'games') return <GamesLauncher open={openGame} />
  return <BackgroundPanel workspace={workspace} />
}
