import type { PollDb } from './db'
import { cleanText, isRoomCode, needsAnswers, randomRoomCode, type ArchivedPoll, type Poll, type Vote } from './model'

/** Rooms nobody has opened for a week are deleted. */
export const STALE_MS = 7 * 24 * 60 * 60 * 1000
export const HEARTBEAT_MS = 30_000

/** This device's poll session id (kept, so a board's room survives reloads). */
export function sessionId(): string {
  try {
    let id = localStorage.getItem('pollSessionId')
    if (!id) {
      id = crypto.randomUUID()
      localStorage.setItem('pollSessionId', id)
    }
    return id
  } catch {
    return 'no-storage'
  }
}

interface Meta {
  sessionId?: string
  ownerUid?: string
  isActiveSession?: boolean
  lastSeenAt?: number
}

const isMine = (db: PollDb, meta: Meta | null) => !!meta && (meta.sessionId === sessionId() || (!!db.uid && meta.ownerUid === db.uid))

async function codeInUse(db: PollDb, code: string) {
  const [meta, history] = await Promise.all([db.get(`rooms/${code}/meta`), db.get(`roomCodeHistory/${code}`)])
  return meta !== null || history !== null
}

export async function heartbeat(db: PollDb, code: string) {
  await db.update(`rooms/${code}/meta`, { isActiveSession: true, lastSeenAt: db.timestamp(), sessionId: sessionId() })
}

/** A new room with a code that has never been used (up to 40 tries). */
export async function createRoom(db: PollDb, random = Math.random): Promise<string> {
  for (let i = 0; i < 40; i++) {
    const code = randomRoomCode(random)
    if (await codeInUse(db, code)) continue
    const owner = db.uid ? { ownerUid: db.uid } : {}
    await db.set(`rooms/${code}`, {
      meta: { sessionId: sessionId(), code, isActiveSession: true, lastSeenAt: db.timestamp(), ...owner },
      currentPoll: { status: 'idle' },
    })
    await db.set(`roomCodeHistory/${code}`, { code, firstUsedAt: db.timestamp(), ...owner })
    return code
  }
  throw new Error('Couldn’t find a free room code. Try again.')
}

/** Reopen this board's room if it's still ours, otherwise make a new one. */
export async function claimRoom(db: PollDb, preferred?: string | null): Promise<string> {
  if (preferred && isRoomCode(preferred)) {
    const meta = (await db.get(`rooms/${preferred}/meta`)) as Meta | null
    if (isMine(db, meta)) {
      await heartbeat(db, preferred)
      return preferred
    }
  }
  void cleanUpStaleRooms(db)
  return createRoom(db)
}

/** Close a room so students can't join it (used when replacing the code). */
export const closeRoom = (db: PollDb, code: string) =>
  db.update(`rooms/${code}/meta`, { isActiveSession: false, replacedAt: db.timestamp() })

/** Delete rooms idle for over a week (the rules allow anyone to remove stale rooms). */
export async function cleanUpStaleRooms(db: PollDb, now = Date.now()) {
  try {
    const codes = await db.staleRooms(now - STALE_MS)
    await Promise.all(codes.map((c) => db.remove(`rooms/${c}`)))
    return codes.length
  } catch {
    return 0
  }
}

export interface PollDraft {
  question: string
  type: Poll['type']
  answers: string[]
  allowCustom: boolean
  allowMultiple: boolean
  maxStars: number
}

export const emptyDraft = (): PollDraft => ({
  question: '',
  type: 'single',
  answers: ['', ''],
  allowCustom: false,
  allowMultiple: false,
  maxStars: 5,
})

/** Problems that stop a poll starting, or null. */
export function draftProblem(d: PollDraft): string | null {
  if (!cleanText(d.question)) return 'Type a question first.'
  if (needsAnswers(d.type) && d.answers.map((a) => cleanText(a, 80)).filter(Boolean).length < 2) return 'Add at least two answers.'
  return null
}

export async function startPoll(db: PollDb, code: string, d: PollDraft): Promise<Poll> {
  const answers = needsAnswers(d.type) ? [...new Set(d.answers.map((a) => cleanText(a, 80)).filter(Boolean))] : []
  const poll: Poll = {
    id: Date.now().toString(36),
    question: cleanText(d.question),
    type: d.type,
    answers,
    allowCustom: d.type === 'multiple' && d.allowCustom,
    allowMultiple: d.allowMultiple,
    maxStars: Math.max(3, Math.min(10, d.maxStars)),
    status: 'active',
  }
  await db.set(`rooms/${code}/currentPoll`, { ...poll, startedAt: db.timestamp() })
  await heartbeat(db, code)
  return poll
}

export const archivePath = (db: PollDb, code: string) => (db.uid ? `archives/${db.uid}` : `rooms/${code}/archive`)

/** End the poll and keep its results in the archive. */
export async function endPoll(db: PollDb, code: string, poll: Poll, votes: Vote[]) {
  await db.set(`rooms/${code}/currentPoll/status`, 'ended')
  const record: Omit<ArchivedPoll, 'id'> = { poll: { ...poll, status: 'ended' }, votes, voteCount: votes.length, endedAt: Date.now() }
  await db.set(`${archivePath(db, code)}/${poll.id}`, record)
}

/** Back to "waiting for a question" on students' screens. */
export const clearPoll = (db: PollDb, code: string) => db.set(`rooms/${code}/currentPoll`, { status: 'idle' })

export const deleteArchived = (db: PollDb, code: string, id: string) => db.remove(`${archivePath(db, code)}/${id}`)

export function parseArchive(value: unknown): ArchivedPoll[] {
  if (!value || typeof value !== 'object') return []
  return Object.entries(value as Record<string, Omit<ArchivedPoll, 'id'>>)
    .filter(([, a]) => a?.poll)
    .map(([id, a]) => ({ ...a, id, votes: Object.values(a.votes ?? []) }))
    .sort((a, b) => (b.endedAt ?? 0) - (a.endedAt ?? 0))
}

export const parseVotes = (value: unknown): Vote[] => (value && typeof value === 'object' ? (Object.values(value) as Vote[]) : [])

/* ------------------------------------------------------------- student */

export type RoomCheck = 'ok' | 'missing' | 'inactive'

export async function checkRoom(db: PollDb, code: string): Promise<RoomCheck> {
  const meta = (await db.get(`rooms/${code}/meta`)) as Meta | null
  if (!meta) return 'missing'
  return meta.isActiveSession ? 'ok' : 'inactive'
}

export async function submitVote(db: PollDb, code: string, pollId: string, vote: Vote) {
  await db.push(`rooms/${code}/votes/${pollId}`, { ...vote, createdAt: db.timestamp() })
}
