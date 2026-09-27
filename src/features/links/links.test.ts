import { beforeEach, describe, expect, it } from 'vitest'
import { DEFAULT_ACTIVITIES } from '@/content/activities'
import { db } from '@/data/db'
import { remove, save } from '@/data/repo'
import { ensureActivities, kindOf, moveLink, normaliseUrl, restoreActivities } from './actions'

beforeEach(async () => {
  await Promise.all(db.tables.map((t) => t.clear()))
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
})
