import type { CSSProperties } from 'react'

/**
 * Letter tiles that shrink so a word fits across the row instead of breaking
 * onto a new line. Rows set `--tile` (tileRowStyle); tiles use TILE.
 */
export const TILE =
  'grid h-[calc(var(--tile)*1.3)] w-[var(--tile)] shrink-0 place-items-center text-[calc(var(--tile)*0.7)] leading-none font-black'

/** Width of a space between words, in tiles. */
export const SPACE = 'w-[calc(var(--tile)*0.45)] shrink-0'

/** How many tiles a row must fit across: the whole phrase, or (for long phrases) enough for its longest word. */
export function tilesAcross(text: string): number {
  const longest = Math.max(1, ...text.split(' ').map((w) => w.length))
  return text.length <= 14 ? Math.max(1, text.length) : Math.max(longest, 12)
}

export const tileRowStyle = (across: number, maxRem = 4.25): CSSProperties =>
  ({ '--tile': `min(${maxRem}rem, calc((100cqw - ${across - 1} * 0.4rem) / ${across}))` }) as CSSProperties

/** Character indices grouped by word, so rows wrap only between words. */
export function wordGroups(text: string): number[][] {
  const groups: number[][] = [[]]
  ;[...text].forEach((ch, i) => {
    if (ch === ' ') groups.push([])
    else groups[groups.length - 1].push(i)
  })
  return groups.filter((g) => g.length)
}
