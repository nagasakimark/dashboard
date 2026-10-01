import { ACTIVITIES_SITE, DEFAULT_ACTIVITIES } from '@/content/activities'
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

type SiteActivity = (typeof DEFAULT_ACTIVITIES)[number]
const urlKey = (url: string) => url.replace(/\/$/, '').toLowerCase()

/** Add any default activity that's missing (matched by URL), including ones you removed. */
export async function restoreActivities(): Promise<number> {
  const site = (await fetchSiteActivities().catch(() => null)) ?? DEFAULT_ACTIVITIES
  return mergeActivities(site, { restoreRemoved: true })
}

/** Read the activity tiles (link + picture + alt text) from the home page's HTML. */
export function parseActivitiesHtml(html: string, base = ACTIVITIES_SITE): SiteActivity[] {
  const doc = new DOMParser().parseFromString(html, 'text/html')
  const seen = new Set<string>()
  const out: SiteActivity[] = []
  for (const a of doc.querySelectorAll('a[href]')) {
    const img = a.querySelector('img[src]')
    if (!img) continue
    try {
      const url = new URL(a.getAttribute('href')!, base).href
      const image = new URL(img.getAttribute('src')!, base).href
      const name = (img.getAttribute('alt') || a.textContent || '').trim() || new URL(url).pathname.replace(/\//g, ' ').trim()
      // This dashboard's own tile on the home page isn't an activity.
      if (new URL(url).pathname.replace(/\/$/, '') === '/dashboard') continue
      if (!/^https?:/.test(url) || seen.has(urlKey(url))) continue
      seen.add(urlKey(url))
      out.push({ name, url, image })
    } catch {
      // Skip malformed links.
    }
  }
  return out
}

export async function fetchSiteActivities(): Promise<SiteActivity[]> {
  const res = await fetch(ACTIVITIES_SITE, { cache: 'no-cache' })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const list = parseActivitiesHtml(await res.text())
  if (list.length < 3) throw new Error('The activities page looks different than expected.')
  return list
}

/**
 * Bring the Activities in line with the site's list: add new ones at the front
 * (the site lists newest first) and refresh pictures hosted on the site. Your
 * own activities, custom pictures and ones you removed are left alone.
 */
export async function mergeActivities(site: SiteActivity[], opts: { restoreRemoved?: boolean } = {}): Promise<number> {
  const all = await db.bookmarks.toArray()
  const mine = new Map(all.filter((b) => kindOf(b) === 'activity').map((b) => [urlKey(b.url), b]))
  const removed = new Set(
    opts.restoreRemoved ? [] : (await db.tombstones.where('table').equals('bookmarks').toArray()).map((t) => t.recordId),
  )
  const siteOrigin = new URL(ACTIVITIES_SITE).origin
  for (const a of site) {
    const b = mine.get(urlKey(a.url))
    if (b && b.image !== a.image && (!b.image || b.image.startsWith(siteOrigin))) await patch('bookmarks', b.id, { image: a.image })
  }
  const fresh = site.filter((a) => !mine.has(urlKey(a.url)) && !removed.has(activityId(a.url)))
  const first = all.reduce((m, b) => Math.min(m, b.order), 0)
  await saveMany(
    'bookmarks',
    fresh.map((a, i) => ({ ...a, id: activityId(a.url), kind: 'activity' as const, order: first - fresh.length + i })),
  )
  return fresh.length
}

const CHECKED_KEY = 'activities:checked'

/** Check the home page for new activities (at most every few hours unless forced). Returns how many were added. */
export async function refreshActivities(force = false): Promise<number> {
  let last = 0
  try {
    last = Number(localStorage.getItem(CHECKED_KEY)) || 0
  } catch {
    // No storage: check every time.
  }
  if (!force && Date.now() - last < 6 * 3600_000) return 0
  const site = await fetchSiteActivities()
  try {
    localStorage.setItem(CHECKED_KEY, String(Date.now()))
  } catch {
    // Ignore.
  }
  return mergeActivities(site)
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
