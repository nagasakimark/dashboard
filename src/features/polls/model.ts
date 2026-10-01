/*
 * Live poll data, shared with the old dashboard's layout in Firebase:
 *   rooms/{code}/meta          { sessionId, code, isActiveSession, lastSeenAt, ownerUid? }
 *   rooms/{code}/currentPoll   Poll
 *   rooms/{code}/votes/{pollId}/{pushId}  Vote
 *   archives/{uid}/{pollId}    ArchivedPoll (rooms/{code}/archive/… without sign-in)
 *   roomCodeHistory/{code}     codes are never reused
 */

export type PollType = 'single' | 'multiple' | 'rank' | 'rating' | 'wordcloud'
export type PollStatus = 'idle' | 'active' | 'ended'

export interface Poll {
  id: string
  question: string
  type: PollType
  answers: string[]
  /** Multiple choice: students may add their own answer ("Other"). */
  allowCustom: boolean
  /** Students may vote again (the old app called this allowMultiple). */
  allowMultiple: boolean
  maxStars: number
  status: PollStatus
  startedAt?: number
}

export type Vote =
  | { type: 'single'; value: string; createdAt?: number }
  | { type: 'multiple'; values: string[]; customValue: string | null; createdAt?: number }
  | { type: 'rank'; ranking: string[]; createdAt?: number }
  | { type: 'rating'; value: number; createdAt?: number }
  | { type: 'wordcloud'; value: string; createdAt?: number }

export interface ArchivedPoll {
  id: string
  poll: Poll
  votes: Vote[]
  voteCount: number
  endedAt: number
}

export const POLL_TYPES: { id: PollType; label: string; hint: string }[] = [
  { id: 'single', label: 'Single choice', hint: 'Pick one answer' },
  { id: 'multiple', label: 'Multiple choice', hint: 'Pick any answers' },
  { id: 'rank', label: 'Ranking', hint: 'Put answers in order' },
  { id: 'rating', label: 'Star rating', hint: 'Rate out of 5–10 stars' },
  { id: 'wordcloud', label: 'Word cloud', hint: 'Type a short answer' },
]

/**
 * A poll as read from the realtime database. Firebase doesn't store empty
 * arrays or null, so a rating or word-cloud poll arrives without `answers`
 * (and old records may lack other fields): fill everything in so the rest of
 * the app can rely on the shape.
 */
export function normalizePoll(value: unknown): Poll | null {
  if (!value || typeof value !== 'object') return null
  const p = value as Record<string, unknown>
  const list = (v: unknown): string[] => (Array.isArray(v) ? v : v && typeof v === 'object' ? Object.values(v) : []).map((x) => String(x))
  const stars = Math.round(Number(p.maxStars))
  return {
    ...(p as Partial<Poll>),
    id: typeof p.id === 'string' ? p.id : '',
    question: String(p.question ?? ''),
    type: POLL_TYPES.some((t) => t.id === p.type) ? (p.type as PollType) : 'single',
    answers: list(p.answers),
    allowCustom: !!p.allowCustom,
    allowMultiple: !!(p.allowMultiple ?? p.allowRevote),
    maxStars: stars >= 1 && stars <= 10 ? stars : 5,
    status: p.status === 'active' || p.status === 'ended' ? p.status : 'idle',
  }
}

/** A vote as read from the database (empty lists and null are missing there). */
export function normalizeVote(value: unknown): Vote | null {
  if (!value || typeof value !== 'object') return null
  const v = value as Record<string, unknown>
  const list = (x: unknown): string[] => (Array.isArray(x) ? x : x && typeof x === 'object' ? Object.values(x) : []).map((y) => String(y))
  const createdAt = typeof v.createdAt === 'number' ? v.createdAt : undefined
  switch (v.type) {
    case 'single':
      return { type: 'single', value: String(v.value ?? ''), createdAt }
    case 'multiple':
      return { type: 'multiple', values: list(v.values), customValue: v.customValue ? String(v.customValue) : null, createdAt }
    case 'rank':
      return { type: 'rank', ranking: list(v.ranking), createdAt }
    case 'rating':
      return { type: 'rating', value: Number(v.value) || 0, createdAt }
    case 'wordcloud':
      return { type: 'wordcloud', value: String(v.value ?? ''), createdAt }
    default:
      return null
  }
}

export const needsAnswers = (type: PollType) => type === 'single' || type === 'multiple' || type === 'rank'

/** Plain text only: tags stripped, whitespace collapsed, length capped. */
export function cleanText(text: unknown, max = 200): string {
  return String(text ?? '')
    .replace(/<[^>]*>/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max)
}

export const isRoomCode = (code: string) => /^[1-9]\d{4}$/.test(code)
export const randomRoomCode = (random = Math.random) => String(10000 + Math.floor(random() * 90000))

/* ------------------------------------------------------------- results */

export type ResultView = 'bar' | 'pie' | 'cloud' | 'rating' | 'rank'

export function viewsFor(type: PollType): ResultView[] {
  if (type === 'rating') return ['rating', 'bar']
  if (type === 'rank') return ['rank', 'bar']
  if (type === 'wordcloud') return ['cloud', 'bar']
  return ['bar', 'pie']
}

export interface Results {
  total: number
  /** Label → count (for rank: Borda points). */
  counts: { label: string; value: number }[]
  /** Free-text answers with frequency (word cloud, custom answers). */
  words: { text: string; value: number }[]
  ratingAverage: number
  ratingDist: { stars: number; value: number }[]
  averageRanks: { label: string; averageRank: number; appearances: number }[]
}

export function computeResults(source: Pick<Poll, 'type' | 'answers' | 'allowCustom' | 'maxStars'>, votes: Vote[]): Results {
  const poll = { ...source, answers: source.answers ?? [] }
  const counts = new Map<string, number>(poll.answers.map((a) => [a, 0]))
  const words = new Map<string, { text: string; value: number }>()
  const addWord = (text: string) => {
    const t = cleanText(text, 60)
    if (!t) return
    const key = t.toLowerCase()
    const w = words.get(key) ?? { text: t, value: 0 }
    w.value++
    words.set(key, w)
  }
  const rankSum = new Map<string, { sum: number; n: number }>(poll.answers.map((a) => [a, { sum: 0, n: 0 }]))
  const maxStars = poll.maxStars || 5
  const dist = Array.from({ length: maxStars }, () => 0)
  let ratingSum = 0
  let ratingN = 0

  for (const v of votes) {
    if (v.type === 'single' && poll.type === 'single') {
      if (counts.has(v.value)) counts.set(v.value, counts.get(v.value)! + 1)
    } else if (v.type === 'multiple' && poll.type === 'multiple') {
      for (const x of v.values ?? []) if (counts.has(x)) counts.set(x, counts.get(x)! + 1)
      if (v.customValue && poll.allowCustom) {
        counts.set('Other', (counts.get('Other') ?? 0) + 1)
        addWord(v.customValue)
      }
    } else if (v.type === 'rank' && poll.type === 'rank') {
      const n = poll.answers.length
      ;(v.ranking ?? []).forEach((label, i) => {
        if (!counts.has(label)) return
        counts.set(label, counts.get(label)! + (n - 1 - i))
        const r = rankSum.get(label)!
        r.sum += i + 1
        r.n++
      })
    } else if (v.type === 'rating' && poll.type === 'rating') {
      const x = Math.round(Number(v.value))
      if (x >= 1 && x <= maxStars) {
        dist[x - 1]++
        ratingSum += x
        ratingN++
      }
    } else if (v.type === 'wordcloud' && poll.type === 'wordcloud') addWord(v.value)
  }

  const wordList = [...words.values()].sort((a, b) => b.value - a.value || a.text.localeCompare(b.text))
  let countList = [...counts.entries()].map(([label, value]) => ({ label, value }))
  if (poll.type === 'rating') countList = dist.map((value, i) => ({ label: `${i + 1}★`, value }))
  if (poll.type === 'wordcloud') countList = wordList.slice(0, 12).map((w) => ({ label: w.text, value: w.value }))

  return {
    total: votes.length,
    counts: countList,
    words: wordList,
    ratingAverage: ratingN ? ratingSum / ratingN : 0,
    ratingDist: dist.map((value, i) => ({ stars: i + 1, value })),
    averageRanks: [...rankSum.entries()]
      .map(([label, r]) => ({ label, averageRank: r.n ? r.sum / r.n : 0, appearances: r.n }))
      .sort((a, b) => (a.appearances ? a.averageRank : 99) - (b.appearances ? b.averageRank : 99)),
  }
}

/* ----------------------------------------------------------------- CSV */

const csvCell = (v: unknown) => {
  const s = String(v ?? '')
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

/** Summary plus raw responses, like the old app's export. */
export function pollCsv(poll: Poll, votes: Vote[]): string {
  const r = computeResults(poll, votes)
  const rows: unknown[][] = [['Question', poll.question], ['Type', poll.type], ['Votes', votes.length], [], ['Summary']]
  if (poll.type === 'rating') {
    rows.push(['Average', r.ratingAverage.toFixed(2)])
    r.ratingDist.forEach((d) => rows.push([`${d.stars} stars`, d.value]))
  } else if (poll.type === 'rank')
    r.averageRanks.forEach((a, i) => rows.push([`Rank ${i + 1}`, a.label, `Average ${a.averageRank.toFixed(2)}`, `${a.appearances} votes`]))
  else if (poll.type === 'wordcloud') r.words.slice(0, 50).forEach((w) => rows.push([w.text, w.value]))
  else r.counts.forEach((c) => rows.push([c.label, c.value]))
  rows.push([], ['Raw responses'])
  for (const v of votes) {
    if (v.type === 'single') rows.push([v.value])
    else if (v.type === 'multiple') rows.push([(v.values ?? []).join(' | '), v.customValue ?? ''])
    else if (v.type === 'rank') rows.push([(v.ranking ?? []).join(' > ')])
    else rows.push([v.value])
  }
  return rows.map((row) => row.map(csvCell).join(',')).join('\n')
}

export const pollFileName = (poll: Poll, date = new Date()) =>
  `poll-${date.toISOString().slice(0, 10)}-${
    poll.question
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 32) || 'results'
  }.csv`
