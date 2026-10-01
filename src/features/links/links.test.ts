import { beforeEach, describe, expect, it, vi } from 'vitest'
import { DEFAULT_ACTIVITIES } from '@/content/activities'
import { db } from '@/data/db'
import { remove, save } from '@/data/repo'
import { ensureActivities, kindOf, mergeActivities, moveLink, normaliseUrl, parseActivitiesHtml, restoreActivities } from './actions'

beforeEach(async () => {
  await Promise.all(db.tables.map((t) => t.clear()))
  // Never reach the real home page: tests run offline, so the bundled list is used.
  vi.stubGlobal('fetch', () => Promise.reject(new TypeError('Failed to fetch')))
})

const activities = async () => (await db.bookmarks.orderBy('order').toArray()).filter((b) => kindOf(b) === 'activity')

describe('links', () => {
  it('adds the default activities once, and deleting them sticks', async () => {
    await ensureActivities()
    expect(await activities()).toHaveLength(DEFAULT_ACTIVITIES.length)
    await remove(
      'bookmarks',
      (await activities()).map((a) => a.id),
    )
    await ensureActivities()
    expect(await activities()).toHaveLength(0)
    expect(await restoreActivities()).toBe(DEFAULT_ACTIVITIES.length)
    expect(await restoreActivities()).toBe(0)
  })

  it('treats old records without a kind as bookmarks', async () => {
    await db.bookmarks.put({ id: 'b', name: 'Old', url: 'https://x', image: '', order: 0, createdAt: 1, updatedAt: 1 } as never)
    expect(kindOf((await db.bookmarks.get('b'))!)).toBe('bookmark')
  })

  it('reorders and normalises links', async () => {
    const a = await save('bookmarks', { name: 'A', url: 'a', image: '', order: 1, kind: 'bookmark' })
    const b = await save('bookmarks', { name: 'B', url: 'b', image: '', order: 2, kind: 'bookmark' })
    await moveLink([a, b], b.id, -1)
    expect((await db.bookmarks.orderBy('order').toArray()).map((x) => x.name)).toEqual(['B', 'A'])
    expect(normaliseUrl('example.com/x')).toBe('https://example.com/x')
    expect(normaliseUrl('mailto:me@x.jp')).toBe('mailto:me@x.jp')
  })

  it('reads the activity tiles from the home page', () => {
    const html = `<div class="box"><a href="https://nagasakimark.github.io/chef" target="_blank"><img src="./images/chef.png" alt="Tomachi Chef"></a></div>
      <div class="box"><a href="/wordle"><img src="images/wordle.png" alt=""></a></div>
      <div class="box"><a href="https://nagasakimark.github.io/dashboard"><img src="./images/dashboard.png" alt="Dashboard"></a></div>
      <p><a href="https://example.com">text only</a></p>`
    expect(parseActivitiesHtml(html)).toEqual([
      { name: 'Tomachi Chef', url: 'https://nagasakimark.github.io/chef', image: 'https://nagasakimark.github.io/images/chef.png' },
      { name: 'wordle', url: 'https://nagasakimark.github.io/wordle', image: 'https://nagasakimark.github.io/images/wordle.png' },
    ])
  })

  it('adds new site activities first, fixes site pictures, and respects removals', async () => {
    await ensureActivities()
    const tescodle = (await activities()).find((a) => a.name === 'Tescodle')!
    await db.bookmarks.update(tescodle.id, { image: 'https://nagasakimark.github.io/home/images/tescodle.png' })
    const wordle = (await activities()).find((a) => a.name === 'Wordle')!
    await remove('bookmarks', wordle.id)
    const site = [
      { name: 'Brand New', url: 'https://nagasakimark.github.io/brandnew', image: 'https://nagasakimark.github.io/images/new.png' },
      { name: 'tescodle', url: 'https://nagasakimark.github.io/tescodle', image: 'https://nagasakimark.github.io/images/tescodle.png' },
      { name: 'Wordle', url: 'https://nagasakimark.github.io/wordle', image: 'https://nagasakimark.github.io/images/wordle.png' },
    ]
    expect(await mergeActivities(site)).toBe(1)
    const list = await activities()
    expect(list[0].name).toBe('Brand New')
    expect(list.find((a) => a.id === tescodle.id)?.image).toBe('https://nagasakimark.github.io/images/tescodle.png')
    expect(list.some((a) => a.name === 'Wordle')).toBe(false)
    expect(await mergeActivities(site)).toBe(0)
    expect(await mergeActivities(site, { restoreRemoved: true })).toBe(1)
  })
})
