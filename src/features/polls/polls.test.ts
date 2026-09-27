import { beforeEach, describe, expect, it } from 'vitest'
import { createLocalDb, getAt, setAt } from './localDb'
import { cleanText, computeResults, isRoomCode, pollCsv, viewsFor, type Poll, type Vote } from './model'
import { pieSlices } from './chartColors'
import {
  checkRoom,
  claimRoom,
  cleanUpStaleRooms,
  createRoom,
  draftProblem,
  emptyDraft,
  endPoll,
  parseArchive,
  parseVotes,
  startPoll,
  STALE_MS,
  submitVote,
} from './session'

const poll = (over: Partial<Poll>): Poll => ({
  id: 'p1',
  question: 'Q',
  type: 'single',
  answers: ['Cats', 'Dogs'],
  allowCustom: false,
  allowMultiple: false,
  maxStars: 5,
  status: 'active',
  ...over,
})

describe('poll model', () => {
  it('strips HTML and whitespace from text', () => {
    expect(cleanText(' <b>Hi</b>\n there ')).toBe('Hi there')
    expect(cleanText('x'.repeat(300)).length).toBe(200)
  })

  it('accepts only 5-digit room codes', () => {
    expect(isRoomCode('12345')).toBe(true)
    expect(isRoomCode('01234')).toBe(false)
    expect(isRoomCode('1234')).toBe(false)
  })

  it('counts single and multiple choice votes, with custom answers', () => {
    const single = computeResults(poll({}), [
      { type: 'single', value: 'Cats' },
      { type: 'single', value: 'Cats' },
      { type: 'single', value: 'Dogs' },
      { type: 'single', value: 'Hacked' },
    ])
    expect(single.counts).toEqual([
      { label: 'Cats', value: 2 },
      { label: 'Dogs', value: 1 },
    ])
    const multi = computeResults(poll({ type: 'multiple', allowCustom: true }), [
      { type: 'multiple', values: ['Cats', 'Dogs'], customValue: 'Birds' },
      { type: 'multiple', values: ['Dogs'], customValue: null },
    ])
    expect(multi.counts).toEqual([
      { label: 'Cats', value: 1 },
      { label: 'Dogs', value: 2 },
      { label: 'Other', value: 1 },
    ])
    expect(multi.words).toEqual([{ text: 'Birds', value: 1 }])
  })

  it('averages ratings and rankings, and groups word-cloud answers', () => {
    const rating = computeResults(poll({ type: 'rating', answers: [] }), [
      { type: 'rating', value: 5 },
      { type: 'rating', value: 3 },
    ])
    expect(rating.ratingAverage).toBe(4)
    expect(rating.ratingDist[4].value).toBe(1)

    const rank = computeResults(poll({ type: 'rank', answers: ['A', 'B', 'C'] }), [
      { type: 'rank', ranking: ['B', 'A', 'C'] },
      { type: 'rank', ranking: ['B', 'C', 'A'] },
    ])
    expect(rank.averageRanks[0]).toEqual({ label: 'B', averageRank: 1, appearances: 2 })

    const cloud = computeResults(poll({ type: 'wordcloud', answers: [] }), [
      { type: 'wordcloud', value: 'Sushi' },
      { type: 'wordcloud', value: 'sushi ' },
      { type: 'wordcloud', value: 'Ramen' },
    ])
    expect(cloud.words[0]).toEqual({ text: 'Sushi', value: 2 })
    expect(viewsFor('wordcloud')[0]).toBe('cloud')
  })

  it('exports a CSV summary and raw responses', () => {
    const csv = pollCsv(poll({ question: 'Pets, "really"?' }), [{ type: 'single', value: 'Cats' }])
    expect(csv).toContain('Question,"Pets, ""really""?"')
    expect(csv).toContain('Cats,1')
    expect(csv.trim().endsWith('Cats')).toBe(true)
  })

  it('folds pie slices past eight into Other', () => {
    const data = Array.from({ length: 10 }, (_, i) => ({ label: `A${i}`, value: 1 }))
    const slices = pieSlices(data)
    expect(slices).toHaveLength(8)
    expect(slices[7]).toEqual({ label: 'Other', value: 3 })
  })

  it('checks drafts', () => {
    expect(draftProblem(emptyDraft())).toMatch(/question/)
    expect(draftProblem({ ...emptyDraft(), question: 'Hi?', answers: ['Yes', ''] })).toMatch(/two answers/)
    expect(draftProblem({ ...emptyDraft(), question: 'Hi?', type: 'wordcloud' })).toBeNull()
  })
})

describe('local poll database', () => {
  beforeEach(() => localStorage.clear())

  it('gets and sets nested paths', () => {
    const t = setAt({}, 'a/b/c', 1)
    expect(getAt(t, 'a/b')).toEqual({ c: 1 })
    expect(getAt(setAt(t, 'a/b', null), 'a')).toEqual({})
  })

  it('runs a whole poll: room, vote, end, archive', async () => {
    const db = createLocalDb()
    const code = await createRoom(db)
    expect(isRoomCode(code)).toBe(true)
    expect(await checkRoom(db, code)).toBe('ok')
    expect(await checkRoom(db, '99999')).toBe('missing')
    // Reopening the board keeps the same room.
    expect(await claimRoom(db, code)).toBe(code)

    const p = await startPoll(db, code, { ...emptyDraft(), question: '<i>Pets?</i>', answers: ['Cats', 'Dogs', 'Cats'] })
    expect(p.question).toBe('Pets?')
    expect(p.answers).toEqual(['Cats', 'Dogs'])

    const seen: unknown[] = []
    const off = db.on(`rooms/${code}/votes/${p.id}`, (v) => seen.push(v))
    await submitVote(db, code, p.id, { type: 'single', value: 'Dogs' })
    off()
    const votes = parseVotes(await db.get(`rooms/${code}/votes/${p.id}`)) as Vote[]
    expect(votes).toHaveLength(1)
    expect(seen.at(-1)).not.toBeNull()

    await endPoll(db, code, p, votes)
    expect(await db.get(`rooms/${code}/currentPoll/status`)).toBe('ended')
    const archive = parseArchive(await db.get(`archives/${db.uid}`))
    expect(archive[0]).toMatchObject({ id: p.id, voteCount: 1 })
  })

  it('never reuses a code and cleans up week-old rooms', async () => {
    const db = createLocalDb()
    const codes = [0.1, 0.1, 0.5]
    const random = () => codes.shift() ?? 0.9
    const a = await createRoom(db, random)
    const b = await createRoom(db, random)
    expect(a).not.toBe(b)
    await db.set(`rooms/${a}/meta/lastSeenAt`, Date.now() - STALE_MS - 1000)
    expect(await cleanUpStaleRooms(db)).toBe(1)
    expect(await db.get(`rooms/${a}`)).toBeNull()
    expect(await db.get(`rooms/${b}`)).not.toBeNull()
  })
})
