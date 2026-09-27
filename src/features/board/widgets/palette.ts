/** Colour swatches offered in widget settings. */
export const SWATCHES = [
  '#4f46e5',
  '#2563eb',
  '#0891b2',
  '#059669',
  '#65a30d',
  '#d97706',
  '#ea580c',
  '#dc2626',
  '#db2777',
  '#9333ea',
  '#475569',
  '#111827',
]

/** Bright, distinct colours for groups, teams and spinner segments. */
export const VIVID = [
  '#ef4444',
  '#3b82f6',
  '#22c55e',
  '#f59e0b',
  '#a855f7',
  '#ec4899',
  '#14b8a6',
  '#f97316',
  '#6366f1',
  '#84cc16',
  '#06b6d4',
  '#e11d48',
]

/** Pick black or white text for a background colour. */
export function textOn(hex: string): string {
  const n = parseInt(hex.slice(1), 16)
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255]
  return 0.299 * r + 0.587 * g + 0.114 * b > 160 ? '#111827' : '#ffffff'
}
