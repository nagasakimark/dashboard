import { lazy, type ComponentType } from 'react'
import { Brain, Eye, Layers, LayoutGrid, ListChecks, Puzzle, Search, SpellCheck, type LucideIcon } from 'lucide-react'
import type { Card } from './data'

export interface GameMode {
  id: string
  name: string
  description: string
  icon: LucideIcon
  /** Minimum cards with pictures needed (0 = works with words only). */
  images: number
  component: ComponentType<{ cards: Card[]; showJa: boolean }>
}

export const MODES: GameMode[] = [
  {
    id: 'flashcards',
    name: 'Flashcards',
    description: 'Flip through picture and word cards',
    icon: Layers,
    images: 0,
    component: lazy(() => import('./modes/Flashcards')),
  },
  {
    id: 'quiz',
    name: 'Quiz',
    description: 'Pick the word for the picture',
    icon: ListChecks,
    images: 1,
    component: lazy(() => import('./modes/Quiz')),
  },
  {
    id: 'cornerpop',
    name: 'Corner Pop',
    description: 'Hear a word, tap its picture',
    icon: LayoutGrid,
    images: 4,
    component: lazy(() => import('./modes/CornerPop')),
  },
  {
    id: 'reveal',
    name: 'Picture Reveal',
    description: 'Uncover a picture tile by tile',
    icon: Search,
    images: 1,
    component: lazy(() => import('./modes/PictureReveal')),
  },
  {
    id: 'missing',
    name: 'Missing',
    description: 'Which cards disappeared?',
    icon: Eye,
    images: 0,
    component: lazy(() => import('./modes/Missing')),
  },
  {
    id: 'scramble',
    name: 'Word Scramble',
    description: 'Unscramble the letters',
    icon: Puzzle,
    images: 0,
    component: lazy(() => import('./modes/Scramble')),
  },
  {
    id: 'spelling',
    name: 'Spelling',
    description: 'Reveal the word letter by letter',
    icon: SpellCheck,
    images: 0,
    component: lazy(() => import('./modes/Spelling')),
  },
  {
    id: 'memory',
    name: 'Memory Match',
    description: 'Match pictures (or Japanese) to words',
    icon: Brain,
    images: 0,
    component: lazy(() => import('./modes/Memory')),
  },
]

export const modeAvailable = (m: GameMode, cards: Card[]) => cards.filter((c) => c.img).length >= m.images
