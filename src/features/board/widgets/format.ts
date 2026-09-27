const pad = (n: number) => String(n).padStart(2, '0')

/** Seconds → "M:SS" or "H:MM:SS". */
export function formatClock(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  return h ? `${h}:${pad(m)}:${pad(s % 60)}` : `${m}:${pad(s % 60)}`
}

/** Milliseconds → "M:SS.cc" (or without hundredths). */
export function formatStopwatch(ms: number, showMs: boolean): string {
  const base = formatClock(ms / 1000)
  return showMs ? `${base}.${pad(Math.floor((ms % 1000) / 10))}` : base
}

/** Parse "[label](url)" into a link, or null for plain text. */
export function parseLink(text: string): { label: string; url: string } | null {
  const m = text.match(/^\s*\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)\s*$/)
  return m ? { label: m[1], url: m[2] } : null
}
