import { useMemo, useState } from 'react'
import { Archive, Check, Copy, Download, Play, Plus, QrCode, RefreshCw, Square, Trash2, X } from 'lucide-react'
import { studentJoinUrl } from '@/app/routes'
import { QrSvg } from '@/components/QrSvg'
import { Badge, Button, IconButton, Input, Select, Spinner, Switch, Tabs, useFeedback } from '@/components/ui'
import { downloadText } from '@/data/transfer'
import { cn } from '@/lib/cn'
import { PollResults } from '@/features/polls/PollResults'
import {
  computeResults,
  needsAnswers,
  pollCsv,
  pollFileName,
  POLL_TYPES,
  viewsFor,
  type ArchivedPoll,
  type ResultView,
} from '@/features/polls/model'
import { clearPoll, deleteArchived, draftProblem, endPoll, startPoll } from '@/features/polls/session'
import { usePollRoom } from '@/features/polls/usePollRoom'
import type { WidgetProps } from '../types'
import type { PollConfig } from './configs'
import { Segmented, Setting, SettingsView, Stepper } from './controls'

type Tab = 'create' | 'live' | 'past'

const VIEW_LABELS: Record<ResultView, string> = { bar: 'Bars', pie: 'Pie', cloud: 'Cloud', rating: 'Stars', rank: 'Ranking' }

function ResultsBlock({
  poll,
  votes,
  view,
  setView,
  large,
}: {
  poll: ArchivedPoll['poll']
  votes: ArchivedPoll['votes']
  view: ResultView | null
  setView: (v: ResultView) => void
  large: boolean
}) {
  const results = useMemo(() => computeResults(poll, votes), [poll, votes])
  const views = viewsFor(poll.type)
  const current = view && views.includes(view) ? view : views[0]
  return (
    <div className="space-y-3">
      <Segmented
        label="Results view"
        value={current}
        options={views.map((v) => ({ value: v, label: VIEW_LABELS[v] }))}
        onChange={setView}
      />
      <PollResults results={results} view={current} type={poll.type} large={large} />
    </div>
  )
}

export default function Poll({ config, update, settings, closeSettings, focused }: WidgetProps<PollConfig>) {
  const { toast, confirm } = useFeedback()
  const room = usePollRoom(config.room, (room) => update({ room }))
  const { db, code, poll, votes, archive } = room
  const [tab, setTab] = useState<Tab>(poll?.status === 'active' ? 'live' : 'create')
  const [showQr, setShowQr] = useState(false)
  const [copied, setCopied] = useState(false)
  const [busy, setBusy] = useState(false)
  const [pastId, setPastId] = useState<string | null>(null)
  const draft = config.draft
  const setDraft = (changes: Partial<PollConfig['draft']>) => update({ draft: { ...draft, ...changes } })
  const joinUrl = code ? studentJoinUrl(code) : ''

  // Jump to the live view whenever a poll is running.
  const [seenPoll, setSeenPoll] = useState<string | undefined>(undefined)
  if (poll?.status === 'active' && poll.id !== seenPoll) {
    setSeenPoll(poll.id)
    setTab('live')
  }

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(joinUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      toast('Couldn’t copy the link.', { tone: 'error' })
    }
  }

  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true)
    try {
      await fn()
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Something went wrong.', { tone: 'error' })
    } finally {
      setBusy(false)
    }
  }

  if (room.error)
    return (
      <div className="grid h-full place-items-center p-4 text-center text-sm">
        <div className="space-y-2">
          <p className="font-semibold text-danger">Live polls are unavailable</p>
          <p className="text-ink-soft">{room.error} Check the internet connection and try again.</p>
        </div>
      </div>
    )
  if (!db || !code)
    return (
      <div className="grid h-full place-items-center">
        <Spinner />
      </div>
    )

  if (settings)
    return (
      <SettingsView onDone={closeSettings}>
        <Setting
          label="Room code"
          hint="Students join at the link below or by typing the code on the student page. The code stays the same until you replace it."
        >
          <div className="flex items-center gap-2">
            <span className="font-mono text-3xl font-black tracking-widest text-accent">{code}</span>
            <IconButton icon={copied ? Check : Copy} label="Copy join link" size="sm" onClick={() => void copy()} />
          </div>
          <p className="truncate text-xs text-ink-faint">{joinUrl}</p>
        </Setting>
        <Button
          size="sm"
          icon={RefreshCw}
          disabled={busy}
          onClick={async () => {
            const ok = await confirm({
              title: 'Get a new room code?',
              message: 'Students on the old code will need to join again.',
              confirmLabel: 'New code',
            })
            if (ok) await run(room.newCode)
          }}
        >
          New room code
        </Button>
        {db.kind === 'local' && <Badge tone="warning">Local test mode: only this browser can join.</Badge>}
      </SettingsView>
    )

  if (showQr)
    return (
      <div className="relative flex h-full flex-col items-center justify-center gap-2 p-3 text-center">
        <IconButton icon={X} label="Hide QR code" size="sm" className="absolute top-2 right-2" onClick={() => setShowQr(false)} />
        <p className="text-sm font-bold tracking-wide text-ink-soft uppercase">Scan to join</p>
        <QrSvg text={joinUrl} color="#111827" size={focused ? 520 : 240} label={`QR code to join room ${code}`} />
        <p className="font-mono text-3xl font-black tracking-widest text-accent">{code}</p>
        <p className="max-w-full truncate text-xs text-ink-faint">{joinUrl.replace(/^https?:\/\//, '')}</p>
      </div>
    )

  const past = archive.find((a) => a.id === pastId) ?? null

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b border-line px-3 py-2">
        <span className="text-[11px] font-semibold tracking-wide text-ink-soft uppercase">Room</span>
        <span className="font-mono text-xl font-black tracking-widest text-accent">{code}</span>
        <span className="flex-1" />
        <IconButton icon={copied ? Check : Copy} label="Copy join link" size="sm" onClick={() => void copy()} />
        <Button size="sm" variant="subtle" icon={QrCode} onClick={() => setShowQr(true)}>
          QR
        </Button>
      </div>
      <Tabs<Tab>
        label="Poll"
        variant="line"
        className="px-3"
        value={tab}
        onChange={setTab}
        items={[
          { id: 'create', label: 'Create' },
          { id: 'live', label: poll?.status === 'active' ? 'Live' : 'Results' },
          { id: 'past', label: 'Past', count: archive.length },
        ]}
      />
      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        {tab === 'create' && (
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault()
              const problem = draftProblem(draft)
              if (problem) return toast(problem, { tone: 'error' })
              void run(async () => {
                if (poll?.status === 'active') await endPoll(db, code, poll, votes)
                await startPoll(db, code, draft)
                setTab('live')
              })
            }}
          >
            <Input
              aria-label="Question"
              placeholder="Ask a question…"
              value={draft.question}
              onChange={(e) => setDraft({ question: e.target.value })}
            />
            <Select
              aria-label="Question type"
              value={draft.type}
              onChange={(e) => setDraft({ type: e.target.value as PollConfig['draft']['type'] })}
              className="h-9"
            >
              {POLL_TYPES.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label} — {t.hint}
                </option>
              ))}
            </Select>
            {needsAnswers(draft.type) && (
              <div className="space-y-1.5">
                {draft.answers.map((a, i) => (
                  <div key={i} className="flex items-center gap-1.5">
                    <Input
                      aria-label={`Answer ${i + 1}`}
                      placeholder={`Answer ${i + 1}`}
                      value={a}
                      onChange={(e) => setDraft({ answers: draft.answers.map((x, j) => (j === i ? e.target.value : x)) })}
                      className="h-9"
                    />
                    <IconButton
                      icon={Trash2}
                      size="sm"
                      label={`Remove answer ${i + 1}`}
                      disabled={draft.answers.length <= 2}
                      onClick={() => setDraft({ answers: draft.answers.filter((_, j) => j !== i) })}
                    />
                  </div>
                ))}
                {draft.answers.length < 10 && (
                  <Button size="sm" variant="ghost" icon={Plus} onClick={() => setDraft({ answers: [...draft.answers, ''] })}>
                    Add answer
                  </Button>
                )}
              </div>
            )}
            {draft.type === 'multiple' && (
              <Switch
                label="Let students add their own answer"
                checked={draft.allowCustom}
                onChange={(allowCustom) => setDraft({ allowCustom })}
              />
            )}
            {draft.type === 'rating' && (
              <Setting label="Stars">
                <Stepper label="Stars" value={draft.maxStars} min={3} max={10} onChange={(maxStars) => setDraft({ maxStars })} />
              </Setting>
            )}
            <Switch
              label="Allow voting more than once"
              checked={draft.allowMultiple}
              onChange={(allowMultiple) => setDraft({ allowMultiple })}
            />
            <Button type="submit" variant="primary" icon={Play} disabled={busy} className="w-full">
              {poll?.status === 'active' ? 'End current poll and start' : 'Start poll'}
            </Button>
          </form>
        )}

        {tab === 'live' &&
          (poll ? (
            <div className="space-y-3">
              <div className="flex items-start gap-2">
                <h3 className={cn('min-w-0 flex-1 font-bold', focused ? 'text-3xl' : 'text-lg leading-snug')}>{poll.question}</h3>
                <Badge tone={poll.status === 'active' ? 'success' : 'neutral'}>{poll.status === 'active' ? 'Live' : 'Ended'}</Badge>
              </div>
              <p className="text-sm text-ink-soft" aria-live="polite">
                <span className="font-bold text-ink tabular-nums">{votes.length}</span> {votes.length === 1 ? 'vote' : 'votes'}
              </p>
              <ResultsBlock poll={poll} votes={votes} view={config.view} setView={(view) => update({ view })} large={focused} />
              <div className="flex flex-wrap gap-2 pt-1">
                {poll.status === 'active' ? (
                  <Button
                    size="sm"
                    variant="danger"
                    icon={Square}
                    disabled={busy}
                    onClick={() => void run(() => endPoll(db, code, poll, votes))}
                  >
                    End poll
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="primary"
                    icon={Plus}
                    disabled={busy}
                    onClick={() =>
                      void run(async () => {
                        await clearPoll(db, code)
                        setDraft({
                          question: '',
                          answers: draft.type === 'rating' || draft.type === 'wordcloud' ? draft.answers : ['', ''],
                        })
                        setTab('create')
                      })
                    }
                  >
                    New question
                  </Button>
                )}
                <Button
                  size="sm"
                  icon={Download}
                  disabled={!votes.length}
                  onClick={() => downloadText(pollCsv(poll, votes), pollFileName(poll), 'text/csv')}
                >
                  CSV
                </Button>
              </div>
            </div>
          ) : (
            <p className="py-8 text-center text-sm text-ink-soft">No poll running. Create a question to start.</p>
          ))}

        {tab === 'past' &&
          (past ? (
            <div className="space-y-3">
              <Button size="sm" variant="ghost" onClick={() => setPastId(null)}>
                ← All past polls
              </Button>
              <h3 className="font-bold">{past.poll.question}</h3>
              <p className="text-xs text-ink-soft">
                {past.voteCount} votes ·{' '}
                {new Date(past.endedAt).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
              </p>
              <ResultsBlock poll={past.poll} votes={past.votes} view={config.view} setView={(view) => update({ view })} large={focused} />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  icon={Download}
                  onClick={() => downloadText(pollCsv(past.poll, past.votes), pollFileName(past.poll, new Date(past.endedAt)), 'text/csv')}
                >
                  CSV
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  icon={Trash2}
                  onClick={() =>
                    void run(async () => {
                      await deleteArchived(db, code, past.id)
                      setPastId(null)
                    })
                  }
                >
                  Delete
                </Button>
              </div>
            </div>
          ) : archive.length ? (
            <ul className="space-y-1">
              {archive.map((a) => (
                <li key={a.id}>
                  <button
                    type="button"
                    onClick={() => setPastId(a.id)}
                    className="flex w-full items-center gap-2 rounded-xl px-2 py-2 text-left hover:bg-canvas"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold">{a.poll.question}</span>
                      <span className="block text-xs text-ink-faint">
                        {POLL_TYPES.find((t) => t.id === a.poll.type)?.label} · {new Date(a.endedAt).toLocaleDateString()}
                      </span>
                    </span>
                    <Badge>{a.voteCount} votes</Badge>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <div className="py-8 text-center text-sm text-ink-soft">
              <Archive className="mx-auto mb-2 text-ink-faint" aria-hidden />
              Ended polls are kept here with their results.
            </div>
          ))}
      </div>
    </div>
  )
}
