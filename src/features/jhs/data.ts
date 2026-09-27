/*
 * New Horizon 1–3 (JHS) grammar points and exercise sets from the old
 * dashboard, stored as public/games/jhs/<id>.json and fetched on demand.
 */

export interface GrammarPoint {
  id: string
  ksNumber: string
  sectionName: string
  page: number
  title: string
  japaneseDescription: string
  englishExplanation: string
  examples: string[]
}

export type Exercise =
  | { type: 'reorder'; question: string; answer: string; hint?: string; translation?: string }
  | { type: 'cloze'; question: string; answer: string; hint?: string; translation?: string }
  | { type: 'choice'; question: string; options: string[]; answer: string; hint?: string; translation?: string }

export interface ExerciseSet {
  id: string
  ksNumber: string
  title: string
  sectionName: string
  topic: string
  page: number
  grammarPoint: GrammarPoint | null
  exercises: Exercise[]
}

export interface JhsBook {
  id: string
  title: string
  cover: string
  grammarPoints: GrammarPoint[]
  exerciseSets: ExerciseSet[]
}

export const JHS_BOOKS = [
  { id: 'nh1', title: 'New Horizon 1' },
  { id: 'nh2', title: 'New Horizon 2' },
  { id: 'nh3', title: 'New Horizon 3' },
]

const base = import.meta.env.BASE_URL
export const jhsCover = (id: string) => `${base}games/jhs/${id}.webp`

const cache = new Map<string, Promise<JhsBook>>()
export function loadBook(id: string): Promise<JhsBook> {
  let p = cache.get(id)
  if (!p) {
    p = fetch(`${base}games/jhs/${id}.json`).then((r) => {
      if (!r.ok) throw new Error('Couldn’t load that textbook.')
      return r.json() as Promise<JhsBook>
    })
    p.catch(() => cache.delete(id))
    cache.set(id, p)
  }
  return p
}

/** Remove source citations like "[10, 11]" left in the old data. */
export const stripCitations = (s: string) => s.replace(/\s*\[\d+(?:\s*,\s*\d+)*\]/g, '')

/** Split "**bold** text" into parts for safe rendering (no HTML). */
export function boldParts(s: string): { text: string; bold: boolean }[] {
  return stripCitations(s)
    .split(/(\*\*[^*]+\*\*)/g)
    .filter(Boolean)
    .map((p) => (p.startsWith('**') && p.endsWith('**') ? { text: p.slice(2, -2), bold: true } : { text: p, bold: false }))
}

/** Compare answers ignoring case, spacing, curly quotes and final punctuation. */
export function sameAnswer(a: string, b: string): boolean {
  const norm = (s: string) =>
    s
      .toLowerCase()
      .replace(/[’‘]/g, "'")
      .replace(/[“”]/g, '"')
      .replace(/[.!?]+$/g, '')
      .replace(/\s+/g, ' ')
      .trim()
  return norm(a) === norm(b)
}

/** Word tiles for a reorder question ("I / am / Edward / Trout."). */
export const reorderTiles = (q: string) =>
  q
    .split('/')
    .map((t) => t.trim())
    .filter(Boolean)

/** Accepted answers for a cloze blank ("am" or "am / is"). */
export const clozeAnswers = (a: string) =>
  a
    .split('/')
    .map((t) => t.trim())
    .filter(Boolean)
