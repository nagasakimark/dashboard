import { DEFAULT_ACTIVITIES } from '@/content/activities'
import { db } from '@/data/db'
import { patch, remove, save, saveMany } from '@/data/repo'
import type { Bookmark } from '@/data/schema'
import { getSettings, setSetting } from '@/data/settings'

export type LinkKind = Bookmark['kind']

/** Records saved before Phase 11 have no kind: they are bookmarks. */
export const kindOf = (b: Pick<Bookmark, 'kind'>): LinkKind => b.kind ?? 'bookmark'

/** Add the default Activities once per device (so deleting them sticks). */
export async function ensureActivities() {
  const s = await getSettings()
  if (s.activitiesSeeded) return
  await setSetting('activitiesSeeded', true)
  const existing = (await db.bookmarks.toArray()).filter((b) => kindOf(b) === 'activity')
  if (existing.length) return
  // Fixed ids and time 0: every device seeds the same records, and any edit
  // synced from another device wins over them.
  await db.bookmarks.bulkPut(
    DEFAULT_ACTIVITIES.map((a, i) => ({ ...a, id: activityId(a.url), kind: 'activity' as const, order: i, createdAt: 0, updatedAt: 0 })),
  )
}

export const activityId = (url: string) =>
  `activity-${url
    .replace(/^https?:\/\/[^/]+\//, '')
    .replace(/[^a-z0-9]+/gi, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase()}`

/** Add any default activity that's missing (matched by URL). */
export async function restoreActivities(): Promise<number> {
  const all = await db.bookmarks.toArray()
  const have = new Set(all.filter((b) => kindOf(b) === 'activity').map((b) => b.url.replace(/\/$/, '').toLowerCase()))
  const start = all.reduce((m, b) => Math.max(m, b.order), 0) + 1
  const missing = DEFAULT_ACTIVITIES.filter((a) => !have.has(a.url.replace(/\/$/, '').toLowerCase()))
  await saveMany(
    'bookmarks',
    missing.map((a, i) => ({ ...a, id: activityId(a.url), kind: 'activity' as const, order: start + i })),
  )
  return missing.length
}

export async function saveLink(
  link: Pick<Bookmark, 'name' | 'url' | 'image' | 'kind'> & Partial<Pick<Bookmark, 'id' | 'createdAt' | 'order'>>,
) {
  const order = link.order ?? (await db.bookmarks.toArray()).reduce((m, b) => Math.max(m, b.order), 0) + 1
  return save('bookmarks', { ...link, url: normaliseUrl(link.url), order })
}

export const normaliseUrl = (url: string) => {
  const u = url.trim()
  return !u || /^[a-z][a-z0-9+.-]*:/i.test(u) ? u : `https://${u}`
}

/** Swap a link with its neighbour in the list shown. */
export async function moveLink(list: Bookmark[], id: string, dir: -1 | 1) {
  const i = list.findIndex((b) => b.id === id)
  const j = i + dir
  if (i < 0 || j < 0 || j >= list.length) return
  await patch('bookmarks', list[i].id, { order: list[j].order })
  await patch('bookmarks', list[j].id, { order: list[i].order === list[j].order ? list[j].order + dir : list[i].order })
}

export async function deleteLink(b: Bookmark) {
  await remove('bookmarks', b.id)
  return () => save('bookmarks', b)
}
