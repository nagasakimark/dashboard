import { createContext, useContext } from 'react'
import type { Roster, School } from '@/data/schema'

export type BoardSettingsTab = 'workspaces' | 'templates' | 'classes' | 'background'

export interface BoardContextValue {
  rosters: Roster[]
  schools: School[]
  openSettings: (tab: BoardSettingsTab) => void
  lastRosterId: string
  setLastRosterId: (id: string) => void
}

export const BoardContext = createContext<BoardContextValue>({
  rosters: [],
  schools: [],
  openSettings: () => {},
  lastRosterId: '',
  setLastRosterId: () => {},
})

export const useBoardContext = () => useContext(BoardContext)
