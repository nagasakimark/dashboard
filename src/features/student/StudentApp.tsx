import { useEffect, useState, type ReactNode } from 'react'
import { CheckCircle2, Hourglass, LogOut, Star, Vote } from 'lucide-react'
import { studentRoomParam } from '@/app/routes'
import { Button, Input, Spinner } from '@/components/ui'
import { cn } from '@/lib/cn'
import { getPollDb, type PollDb } from '@/features/polls/db'
import { cleanText, isRoomCode, type Poll, type Vote as VoteT } from '@/features/polls/model'
import { checkRoom, submitVote } from '@/features/polls/session'
import { RankList } from './RankList'

const votedKey = (room: string, pollId: string) => `voted:${room}:${pollId}`
const hasVoted = (room: string, pollId: string) => {
  try {
    return sessionStorage.getItem(votedKey(room, pollId)) === '1'
  } catch {
    return false
  }
}

function Shell({ children, room, onLeave }: { children: ReactNode; room?: string; onLeave?: () => void }) {
  return (
    <div className="min-h-dvh bg-gradient-to-br from-indigo-50 via-white to-cyan-50 px-4 py-6">
      <div className="mx-auto flex min-h-[calc(100dvh-3rem)] max-w-md flex-col">
        {room && (
          <div className="mb-4 flex items-center justify-between">
            <span className="rounded-full bg-white px-3 py-1 text-sm shadow-sm">
              Room <span className="font-mono font-black tracking-wider text-accent">{room}</span>
            </span>
            <button type="button" onClick={onLeave} className="flex items-center gap-1 text-sm font-medium text-ink-soft hover:text-ink">
              <LogOut size={15} aria-hidden /> Leave
            </button>
          </div>
        )}
        <main className="grid flex-1 place-items-center">
          <div className="w-full animate-pop-in rounded-3xl bg-white p-6 shadow-pop sm:p-8">{children}</div>
        </main>
      </div>
    </div>
  )
}

function Join({ onJoin, initial }: { onJoin: (db: PollDb, code: string) => void; initial: string }) {
  const [code, setCode] = useState(initial)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const join = async (value: string) => {
    const c = value.trim()
    if (!isRoomCode(c)) return setError('Enter the 5-digit code on the board.')
    setBusy(true)
    setError('')
    try {
      const db = await getPollDb({ signIn: false })
      const status = await checkRoom(db, c)
      if (status === 'missing') setError('That room code wasn’t found.')
      else if (status === 'inactive') setError('That room is no longer open. Ask your teacher for the current code.')
      else onJoin(db, c)
    } catch {
      setError('Can’t reach the poll right now. Check your connection and try again.')
    } finally {
      setBusy(false)
    }
  }

  useEffect(() => {
    if (isRoomCode(initial)) void join(initial)
    // Join once from the link.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <Shell>
      <form
        className="space-y-4 text-center"
        onSubmit={(e) => {
          e.preventDefault()
          void join(code)
        }}
      >
        <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-accent-soft text-accent">
          <Vote size={26} aria-hidden />
        </span>
        <h1 className="text-2xl font-bold">Join a poll</h1>
        <p className="text-sm text-ink-soft">Type the room code from the board.</p>
        <Input
          aria-label="Room code"
          inputMode="numeric"
          autoComplete="off"
          maxLength={5}
          placeholder="12345"
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
          className="h-14 text-center font-mono text-3xl font-black tracking-[0.3em]"
        />
        {error && (
          <p role="alert" className="text-sm font-medium text-danger">
            {error}
          </p>
        )}
        <Button type="submit" variant="primary" size="lg" className="w-full" disabled={busy}>
          {busy ? 'Checking…' : 'Join'}
        </Button>
      </form>
    </Shell>
  )
}

function Ballot({ poll, onSubmit }: { poll: Poll; onSubmit: (v: VoteT) => Promise<void> }) {
  const [picked, setPicked] = useState<string[]>([])
  const [text, setText] = useState('')
  const [ranking, setRanking] = useState(poll.answers)
  const [stars, setStars] = useState(0)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const build = (): VoteT | null => {
    if (poll.type === 'single') return picked[0] ? { type: 'single', value: picked[0] } : null
    if (poll.type === 'multiple')
      return picked.length || cleanText(text, 60) ? { type: 'multiple', values: picked, customValue: cleanText(text, 60) || null } : null
    if (poll.type === 'rank') return { type: 'rank', ranking }
    if (poll.type === 'rating') return stars ? { type: 'rating', value: stars } : null
    return cleanText(text, 60) ? { type: 'wordcloud', value: cleanText(text, 60) } : null
  }

  const choice = (a: string) => {
    const on = picked.includes(a)
    const multi = poll.type === 'multiple'
    return (
      <button
        key={a}
        type="button"
        role={multi ? 'checkbox' : 'radio'}
        aria-checked={on}
        onClick={() => setPicked(multi ? (on ? picked.filter((x) => x !== a) : [...picked, a]) : [a])}
        className={cn(
          'flex w-full items-center gap-3 rounded-2xl border-2 px-4 py-3 text-left text-base font-semibold transition-colors',
          on ? 'border-accent bg-accent-soft text-accent-strong' : 'border-line hover:border-accent-muted',
        )}
      >
        <span
          className={cn(
            'grid size-6 shrink-0 place-items-center border-2',
            multi ? 'rounded-md' : 'rounded-full',
            on ? 'border-accent bg-accent text-white' : 'border-ink-faint/50',
          )}
        >
          {on && <CheckCircle2 size={14} aria-hidden />}
        </span>
        {a}
      </button>
    )
  }

  return (
    <form
      className="space-y-5"
      onSubmit={async (e) => {
        e.preventDefault()
        const v = build()
        if (!v) return setError(poll.type === 'wordcloud' ? 'Type an answer first.' : 'Choose an answer first.')
        setBusy(true)
        setError('')
        try {
          await onSubmit(v)
        } catch {
          setError('Your vote didn’t send. Try again.')
        } finally {
          setBusy(false)
        }
      }}
    >
      <div>
        <span className="text-xs font-bold tracking-wider text-accent uppercase">Question</span>
        <h1 className="mt-1 text-2xl leading-tight font-bold">{poll.question}</h1>
      </div>
      {(poll.type === 'single' || poll.type === 'multiple') && (
        <div role={poll.type === 'single' ? 'radiogroup' : 'group'} aria-label="Answers" className="space-y-2">
          {poll.answers.map(choice)}
          {poll.type === 'multiple' && poll.allowCustom && (
            <Input
              aria-label="Your own answer"
              placeholder="Or type your own answer"
              value={text}
              onChange={(e) => setText(e.target.value)}
              maxLength={60}
              className="h-12"
            />
          )}
        </div>
      )}
      {poll.type === 'rank' && <RankList items={ranking} onChange={setRanking} />}
      {poll.type === 'rating' && (
        <div role="radiogroup" aria-label="Rating" className="flex flex-wrap justify-center gap-1">
          {Array.from({ length: poll.maxStars || 5 }, (_, i) => (
            <button
              key={i}
              type="button"
              role="radio"
              aria-checked={stars === i + 1}
              aria-label={`${i + 1} stars`}
              onClick={() => setStars(i + 1)}
              className="p-1 text-amber-400 transition-transform active:scale-90"
            >
              <Star size={36} fill={i < stars ? 'currentColor' : 'none'} aria-hidden />
            </button>
          ))}
        </div>
      )}
      {poll.type === 'wordcloud' && (
        <Input
          aria-label="Your answer"
          placeholder="Type a word or two"
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={60}
          className="h-14 text-lg"
        />
      )}
      {error && (
        <p role="alert" className="text-sm font-medium text-danger">
          {error}
        </p>
      )}
      <Button type="submit" variant="primary" size="lg" className="w-full" disabled={busy}>
        {busy ? 'Sending…' : 'Submit'}
      </Button>
    </form>
  )
}

function Room({ db, room, onLeave }: { db: PollDb; room: string; onLeave: () => void }) {
  const [poll, setPoll] = useState<Poll | null | undefined>(undefined)
  const [submitted, setSubmitted] = useState<string | null>(null)

  useEffect(() => db.on(`rooms/${room}/currentPoll`, (v) => setPoll(v && typeof v === 'object' ? (v as Poll) : null)), [db, room])

  const pollId = poll?.id
  const done = !!pollId && (submitted === pollId || (hasVoted(room, pollId) && !poll?.allowMultiple))

  if (poll === undefined)
    return (
      <Shell room={room} onLeave={onLeave}>
        <div className="grid place-items-center py-8">
          <Spinner />
        </div>
      </Shell>
    )

  if (!poll || !poll.id || poll.status === 'idle')
    return (
      <Shell room={room} onLeave={onLeave}>
        <div className="space-y-3 py-4 text-center">
          <Hourglass className="mx-auto animate-pulse text-accent" size={36} aria-hidden />
          <h1 className="text-2xl font-bold">Waiting for a question…</h1>
          <p className="text-ink-soft">Your teacher will start the next one soon.</p>
        </div>
      </Shell>
    )

  if (poll.status === 'ended' || done)
    return (
      <Shell room={room} onLeave={onLeave}>
        <div className="space-y-3 py-4 text-center">
          <CheckCircle2 className="mx-auto text-success" size={48} aria-hidden />
          <h1 className="text-2xl font-bold">{done ? 'Vote submitted!' : 'This poll has ended'}</h1>
          <p className="text-ink-soft">
            {poll.status === 'ended' ? 'Waiting for the next question…' : 'Look at the board for the results.'}
          </p>
        </div>
      </Shell>
    )

  return (
    <Shell room={room} onLeave={onLeave}>
      <Ballot
        key={`${poll.id}-${submitted ?? ''}`}
        poll={poll}
        onSubmit={async (v) => {
          await submitVote(db, room, poll.id, v)
          try {
            sessionStorage.setItem(votedKey(room, poll.id), '1')
          } catch {
            /* private mode */
          }
          setSubmitted(poll.id)
          // With re-voting on, the form comes back after a moment.
          if (poll.allowMultiple) setTimeout(() => setSubmitted((s) => (s === poll.id ? `${poll.id}:again` : s)), 1500)
        }}
      />
    </Shell>
  )
}

/** Student poll page: answers at /dashboard/student?room=12345 and #/student?room=12345. */
export default function StudentApp() {
  const [joined, setJoined] = useState<{ db: PollDb; code: string } | null>(null)
  const [left, setLeft] = useState(false)
  if (!joined)
    return <Join initial={left ? '' : (studentRoomParam(window.location) ?? '')} onJoin={(db, code) => setJoined({ db, code })} />
  return (
    <Room
      db={joined.db}
      room={joined.code}
      onLeave={() => {
        setLeft(true)
        setJoined(null)
      }}
    />
  )
}
