import type { PollDb } from './db'

/*
 * A realtime-database stand-in kept in localStorage and shared between tabs
 * with BroadcastChannel. Used by the e2e tests (teacher and student pages in
 * one browser) and handy for trying polls without a network.
 */

const KEY = 'poll-local-db'
type Tree = Record<string, unknown>

const split = (path: string) => path.split('/').filter(Boolean)

function read(): Tree {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '{}') as Tree
  } catch {
    return {}
  }
}

export function getAt(tree: unknown, path: string): unknown {
  let node = tree
  for (const k of split(path)) {
    if (node === null || typeof node !== 'object') return null
    node = (node as Tree)[k]
  }
  return node ?? null
}

export function setAt(tree: Tree, path: string, value: unknown): Tree {
  const keys = split(path)
  const root = structuredClone(tree)
  let node = root
  keys.slice(0, -1).forEach((k) => {
    if (typeof node[k] !== 'object' || node[k] === null) node[k] = {}
    node = node[k] as Tree
  })
  const last = keys[keys.length - 1]
  if (value === null || value === undefined) delete node[last]
  else node[last] = structuredClone(value)
  return root
}

export function createLocalDb(): PollDb {
  const channel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel(KEY) : null
  const listeners = new Set<() => void>()
  const notify = () => listeners.forEach((l) => l())
  channel?.addEventListener('message', notify)
  window.addEventListener('storage', (e) => e.key === KEY && notify())

  const write = (tree: Tree) => {
    localStorage.setItem(KEY, JSON.stringify(tree))
    notify()
    channel?.postMessage('change')
  }
  const resolveTimestamps = (v: unknown): unknown =>
    v && typeof v === 'object'
      ? '.sv' in (v as Tree)
        ? Date.now()
        : Array.isArray(v)
          ? v.map(resolveTimestamps)
          : Object.fromEntries(Object.entries(v as Tree).map(([k, x]) => [k, resolveTimestamps(x)]))
      : v

  /**
   * Store values the way Firebase does: null and undefined are not kept, and
   * neither are empty arrays or objects. (Code that reads polls must cope with
   * missing lists, which production hits with rating and word-cloud polls.)
   */
  const asFirebase = (v: unknown): unknown => {
    if (v === null || v === undefined) return undefined
    if (Array.isArray(v)) {
      const list = v.map(asFirebase).filter((x) => x !== undefined)
      return list.length ? list : undefined
    }
    if (typeof v === 'object') {
      const entries = Object.entries(v as Tree)
        .map(([k, x]) => [k, asFirebase(x)] as const)
        .filter(([, x]) => x !== undefined)
      return entries.length ? Object.fromEntries(entries) : undefined
    }
    return v
  }
  const prepare = (v: unknown) => asFirebase(resolveTimestamps(v))

  let uid = localStorage.getItem('poll-local-uid')
  if (!uid) {
    uid = `local-${crypto.randomUUID().slice(0, 8)}`
    localStorage.setItem('poll-local-uid', uid)
  }

  return {
    kind: 'local',
    uid,
    get: async (path) => getAt(read(), path),
    set: async (path, value) => write(setAt(read(), path, prepare(value))),
    update: async (path, value) => {
      let tree = read()
      for (const [k, v] of Object.entries(value)) tree = setAt(tree, `${path}/${k}`, prepare(v))
      write(tree)
    },
    push: async (path, value) => {
      const key = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`
      write(setAt(read(), `${path}/${key}`, prepare(value)))
      return key
    },
    remove: async (path) => write(setAt(read(), path, null)),
    on: (path, cb) => {
      let last = ''
      const check = () => {
        const v = getAt(read(), path)
        const s = JSON.stringify(v)
        if (s !== last) {
          last = s
          cb(v)
        }
      }
      listeners.add(check)
      check()
      return () => listeners.delete(check)
    },
    staleRooms: async (before) =>
      Object.entries((read().rooms as Tree | undefined) ?? {})
        .filter(([, room]) => Number(getAt(room, 'meta/lastSeenAt') ?? 0) < before)
        .map(([code]) => code),
    timestamp: () => ({ '.sv': 'timestamp' }),
  }
}
