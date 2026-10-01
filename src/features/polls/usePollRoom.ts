import { useCallback, useEffect, useState } from 'react'
import { getPollDb, type PollDb } from './db'
import { normalizePoll, type ArchivedPoll, type Poll, type Vote } from './model'
import { archivePath, claimRoom, closeRoom, createRoom, heartbeat, HEARTBEAT_MS, parseArchive, parseVotes } from './session'

export interface PollRoom {
  db: PollDb | null
  code: string | null
  error: string | null
  poll: (Poll & { status: Poll['status'] }) | null
  votes: Vote[]
  archive: ArchivedPoll[]
  newCode: () => Promise<void>
}

/**
 * The teacher's room: claimed (or created) once, kept alive with a
 * heartbeat, with the current poll, its votes and the archive live.
 */
export function usePollRoom(saved: string | null, onCode: (code: string) => void): PollRoom {
  const [db, setDb] = useState<PollDb | null>(null)
  const [code, setCode] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [poll, setPoll] = useState<Poll | null>(null)
  const [votes, setVotes] = useState<Vote[]>([])
  const [archive, setArchive] = useState<ArchivedPoll[]>([])

  useEffect(() => {
    let cancelled = false
    getPollDb()
      .then(async (d) => {
        const c = await claimRoom(d, saved)
        if (cancelled) return
        setDb(d)
        setCode(c)
        if (c !== saved) onCode(c)
      })
      .catch((e: unknown) => !cancelled && setError(e instanceof Error ? e.message : 'Couldn’t reach the poll server.'))
    return () => {
      cancelled = true
    }
    // Claim once per mount; later code changes come from newCode().
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!db || !code) return
    const id = setInterval(() => void heartbeat(db, code).catch(() => {}), HEARTBEAT_MS)
    const offPoll = db.on(`rooms/${code}/currentPoll`, (v) => setPoll(v && typeof v === 'object' && 'id' in v ? normalizePoll(v) : null))
    const offArchive = db.on(archivePath(db, code), (v) => setArchive(parseArchive(v)))
    return () => {
      clearInterval(id)
      offPoll()
      offArchive()
    }
  }, [db, code])

  const pollId = poll?.id
  useEffect(() => {
    if (!db || !code || !pollId) return
    return db.on(`rooms/${code}/votes/${pollId}`, (v) => setVotes(parseVotes(v)))
  }, [db, code, pollId])

  const newCode = useCallback(async () => {
    if (!db) return
    if (code) await closeRoom(db, code).catch(() => {})
    const c = await createRoom(db)
    setPoll(null)
    setVotes([])
    setCode(c)
    onCode(c)
  }, [db, code, onCode])

  return { db, code, error, poll, votes: pollId ? votes : [], archive, newCode }
}
