/*
 * A small log of errors, kept on this device so a crash can be diagnosed
 * ("Settings → Help → Copy error details") even after a reload.
 */

const KEY = 'errorLog'
const MAX = 20

export interface LoggedError {
  at: number
  where: string
  message: string
  stack: string
  version: string
}

export function readErrorLog(): LoggedError[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '[]') as LoggedError[]
  } catch {
    return []
  }
}

export function logError(error: unknown, where: string): void {
  const e = error instanceof Error ? error : new Error(typeof error === 'string' ? error : JSON.stringify(error))
  const entry: LoggedError = {
    at: Date.now(),
    where: `${where} ${window.location.hash}`.trim(),
    message: e.message,
    stack: (e.stack ?? '').split('\n').slice(0, 8).join('\n'),
    version: typeof __APP_VERSION__ === 'string' ? __APP_VERSION__ : '',
  }
  console.error(`[${where}]`, error)
  try {
    localStorage.setItem(KEY, JSON.stringify([entry, ...readErrorLog()].slice(0, MAX)))
  } catch {
    // Storage full or blocked: the console copy is enough.
  }
}

/** Plain-text report of the recent errors, for pasting into a message. */
export function errorReport(): string {
  const log = readErrorLog()
  return log.length
    ? log.map((e) => `${new Date(e.at).toISOString()} v${e.version} ${e.where}\n${e.message}\n${e.stack}`).join('\n\n')
    : 'No errors recorded.'
}
