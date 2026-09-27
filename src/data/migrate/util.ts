/** Small helpers for reading loosely-typed legacy data. */

export type Json = Record<string, unknown>

export const isObj = (v: unknown): v is Json => typeof v === 'object' && v !== null && !Array.isArray(v)
export const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : [])
export const objs = (v: unknown): Json[] => arr(v).filter(isObj)
export const str = (v: unknown, fallback = ''): string => (typeof v === 'string' ? v : typeof v === 'number' ? String(v) : fallback)
export const idStr = (v: unknown): string | null => (v === null || v === undefined || v === '' ? null : String(v))

export function int(v: unknown): number | null {
  const n = typeof v === 'number' ? v : typeof v === 'string' && v.trim() !== '' ? Number(v) : NaN
  return Number.isFinite(n) && n > 0 ? Math.trunc(n) : null
}

/** ISO string / epoch → epoch ms, or the fallback. */
export function toMs(v: unknown, fallback: number): number {
  if (typeof v === 'number' && Number.isFinite(v)) return v
  if (typeof v === 'string') {
    const t = Date.parse(v)
    if (!Number.isNaN(t)) return t
  }
  return fallback
}

export const HEX = /^#[0-9a-fA-F]{6}$/
export function hexColor(v: unknown, fallback: string): string {
  const s = str(v).trim()
  if (HEX.test(s)) return s.toLowerCase()
  if (/^#[0-9a-fA-F]{3}$/.test(s))
    return `#${s
      .slice(1)
      .split('')
      .map((c) => c + c)
      .join('')}`.toLowerCase()
  return fallback
}

export const escapeHtml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

/**
 * Lesson plan content is normally Quill HTML. Very old exports may hold a
 * Quill Delta object (or its JSON string); flatten that to simple paragraphs.
 */
export function contentToHtml(v: unknown): string {
  let content = v
  if (typeof v === 'string') {
    const t = v.trim()
    if (!t.startsWith('{')) return v
    try {
      content = JSON.parse(t)
    } catch {
      return v
    }
  }
  if (isObj(content) && Array.isArray(content.ops)) {
    const text = content.ops.map((op) => (isObj(op) && typeof op.insert === 'string' ? op.insert : '')).join('')
    return text
      .split('\n')
      .filter((line, i, all) => line !== '' || i < all.length - 1)
      .map((line) => `<p>${line ? escapeHtml(line) : '<br>'}</p>`)
      .join('')
  }
  return ''
}

export const pluralize = (n: number, one: string, many = `${one}s`) => `${n.toLocaleString()} ${n === 1 ? one : many}`
