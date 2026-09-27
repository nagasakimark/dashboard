import { BookOpen, Bookmark, Gamepad2 } from 'lucide-react'
import { Tabs } from '@/components/ui'
import { LinkGrid } from './LinkGrid'
import { TextbookLinks } from './TextbookLinks'

export type LinksTab = 'activities' | 'bookmarks' | 'textbooks'

/** Activities, bookmarks and textbook links (planner page and board panel). */
export function LinksPanel({ tab, onTab, compact = false }: { tab: LinksTab; onTab: (t: LinksTab) => void; compact?: boolean }) {
  return (
    <div className="space-y-4">
      <Tabs<LinksTab>
        label="Links"
        value={tab}
        onChange={onTab}
        items={[
          { id: 'activities', label: 'Activities', icon: Gamepad2 },
          { id: 'bookmarks', label: 'Bookmarks', icon: Bookmark },
          { id: 'textbooks', label: 'Textbooks', icon: BookOpen },
        ]}
      />
      {tab === 'textbooks' ? (
        <TextbookLinks />
      ) : (
        <LinkGrid key={tab} kind={tab === 'activities' ? 'activity' : 'bookmark'} compact={compact} />
      )}
    </div>
  )
}
