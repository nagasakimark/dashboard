import type { VocabCard, VocabSet } from '@/data/schema'
import SETS from '@/content/games/sets.json'

/*
 * Built-in vocabulary sets live in public/games/sets/<id>.json (fetched when
 * opened, then cached offline by the service worker) with a small index
 * bundled here. Images are WebP files in public/games/img/.
 */

export type Card = VocabCard

export interface SetInfo {
  id: string
  title: string
  group: string
  count: number
  cover: string
  /** JHS units: textbook pages the unit covers. */
  pages?: number[]
}

export interface Deck {
  id: string
  title: string
  group: string
  cards: Card[]
}

export const BUILT_IN_SETS = SETS as SetInfo[]

export const GROUPS = [...new Set(BUILT_IN_SETS.map((s) => s.group))]
export const ELEMENTARY_GROUPS = GROUPS.filter((g) => !g.endsWith('(JHS)'))
export const JHS_GROUPS = GROUPS.filter((g) => g.endsWith('(JHS)'))

const base = import.meta.env.BASE_URL

/** The textbooks' real covers (from the old dashboard). */
const BOOK_COVERS: Record<string, string> = {
  "Let's Try 1": 'lt1',
  "Let's Try 2": 'lt2',
  'New Horizon 5': 'nh5',
  'New Horizon 6': 'nh6',
}

/** Cover picture for a group of sets: the textbook's cover, or its first set's picture. */
export function groupCover(group: string): string {
  if (group.endsWith('(JHS)')) return `${base}games/jhs/nh${group.match(/\d/)?.[0] ?? '1'}.webp`
  if (BOOK_COVERS[group]) return `${base}games/covers/${BOOK_COVERS[group]}.webp`
  return imageUrl(BUILT_IN_SETS.find((s) => s.group === group && s.cover)?.cover ?? '')
}

/** URL for a card image: built-in path or a data: URL from a custom set. */
export const imageUrl = (img: string) => (!img ? '' : img.startsWith('data:') || /^https?:/.test(img) ? img : `${base}games/img/${img}`)

const cache = new Map<string, Promise<Deck>>()

export function loadSet(id: string): Promise<Deck> {
  let p = cache.get(id)
  if (!p) {
    p = fetch(`${base}games/sets/${id}.json`).then((r) => {
      if (!r.ok) throw new Error(`Couldn’t load that set (${r.status}).`)
      return r.json() as Promise<Deck>
    })
    p.catch(() => cache.delete(id))
    cache.set(id, p)
  }
  return p
}

export const unitNumber = (title: string) => {
  const m = /^Unit\s+(\d+)/i.exec(title)
  return m ? Number(m[1]) : null
}

/** Textbook groups have numbered units, so "with previous units" makes sense. */
export const hasUnits = (group: string) => BUILT_IN_SETS.some((s) => s.group === group && unitNumber(s.title) !== null)

/** Ids to load for a set, optionally with every earlier unit of the same book. */
export function setIdsWithPrevious(id: string, previous: boolean): string[] {
  const set = BUILT_IN_SETS.find((s) => s.id === id)
  const n = set ? unitNumber(set.title) : null
  if (!set || !previous || n === null) return [id]
  return BUILT_IN_SETS.filter((s) => s.group === set.group && (unitNumber(s.title) ?? Infinity) <= n)
    .sort((a, b) => unitNumber(a.title)! - unitNumber(b.title)!)
    .map((s) => s.id)
}

/** Drop repeated cards (same word and picture). */
export function uniqueCards(cards: Card[]): Card[] {
  const seen = new Set<string>()
  return cards.filter((c) => {
    const k = `${c.en}::${c.img}`.toLowerCase()
    if (seen.has(k)) return false
    seen.add(k)
    return true
  })
}

export async function loadDeck(id: string, previous = false): Promise<Deck> {
  const ids = setIdsWithPrevious(id, previous)
  const decks = await Promise.all(ids.map(loadSet))
  const main = decks[decks.length - 1]
  return {
    ...main,
    title: ids.length > 1 ? `${main.title} + previous units` : main.title,
    cards: uniqueCards(decks.flatMap((d) => d.cards)),
  }
}

export const customDeck = (s: VocabSet): Deck => ({ id: `custom:${s.id}`, title: s.name, group: 'My sets', cards: uniqueCards(s.cards) })

/** Warm the image cache so games don't wait on pictures (and work offline later). */
export function preloadImages(cards: Card[]) {
  for (const c of cards) {
    const url = imageUrl(c.img)
    if (url && !url.startsWith('data:')) new Image().src = url
  }
}

export const withImages = (cards: Card[]) => cards.filter((c) => c.img)

/** Every built-in picture, for choosing images in custom sets (loaded on demand). */
export async function imageLibrary(): Promise<{ en: string; img: string }[]> {
  const ids = BUILT_IN_SETS.filter((s) => !s.group.endsWith('(JHS)')).map((s) => s.id)
  const decks = await Promise.all(ids.map(loadSet))
  const seen = new Set<string>()
  return decks
    .flatMap((d) => d.cards)
    .filter((c) => c.img && !seen.has(c.img) && seen.add(c.img))
    .map((c) => ({ en: c.en, img: c.img }))
}
