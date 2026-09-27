import { getDayOfYear } from 'date-fns'

/*
 * Board backgrounds: 4 gradients, then 24 wallpapers. Indexes match the old
 * dashboard's `bgIndex`, so migrated workspaces keep their background.
 * Wallpapers are WebP (≤1920 px) in public/wallpapers and are cached on first
 * use by the service worker's image rule.
 */

export interface Background {
  index: number
  kind: 'gradient' | 'image'
  /** CSS `background` value */
  css: string
  /** Thumbnail CSS for the picker */
  thumb: string
  /** Light backgrounds need dark text on the chrome. */
  light: boolean
}

const GRADIENTS = [
  { css: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', light: false },
  { css: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)', light: true },
  { css: 'linear-gradient(to top, #a18cd1 0%, #fbc2eb 100%)', light: false },
  { css: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', light: false },
]

export const WALLPAPER_COUNT = 24

const url = (file: string) => `url("${import.meta.env.BASE_URL}wallpapers/${file}")`

export const BACKGROUNDS: Background[] = [
  ...GRADIENTS.map((g, index) => ({ index, kind: 'gradient' as const, css: g.css, thumb: g.css, light: g.light })),
  ...Array.from({ length: WALLPAPER_COUNT }, (_, i) => ({
    index: GRADIENTS.length + i,
    kind: 'image' as const,
    css: `${url(`${i + 1}.webp`)} center / cover no-repeat, #1e293b`,
    thumb: `${url(`${i + 1}-thumb.webp`)} center / cover no-repeat, #1e293b`,
    light: false,
  })),
]

/** Wallpaper shown today when daily rotation is on (same rule as the old app). */
export const dailyWallpaperIndex = (date: Date) => GRADIENTS.length + (getDayOfYear(date) % WALLPAPER_COUNT)

export function resolveBackground(workspaceIndex: number, rotate: boolean, date: Date): Background {
  const index = rotate ? dailyWallpaperIndex(date) : workspaceIndex
  return BACKGROUNDS[index] ?? BACKGROUNDS[0]
}
