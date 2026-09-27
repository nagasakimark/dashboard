/**
 * The student poll page is reachable three ways:
 *  - /dashboard/student?room=12345 (production QR codes; served via 404.html)
 *  - /dashboard/next/student?room=… (same, on the preview deployment)
 *  - …/#/student?room=… (works anywhere, no 404 fallback needed)
 */
export function isStudentRoute(loc: Pick<Location, 'pathname' | 'hash'>): boolean {
  return /\/student\/?$/.test(loc.pathname) || loc.hash.startsWith('#/student')
}

/** Room code from either the query string or the hash route's query. */
export function studentRoomParam(loc: Pick<Location, 'search' | 'hash'>): string | null {
  const fromSearch = new URLSearchParams(loc.search).get('room')
  if (fromSearch) return fromSearch
  const q = loc.hash.indexOf('?')
  return q >= 0 ? new URLSearchParams(loc.hash.slice(q)).get('room') : null
}

/**
 * Public URL students scan to join a poll room. Production keeps the
 * historical path form; other deployments (e.g. /dashboard/next/) use the
 * hash form because GitHub Pages only honours the site-root 404.html.
 */
export function studentJoinUrl(room: string, origin = window.location.origin, base = import.meta.env.BASE_URL): string {
  const code = encodeURIComponent(room)
  return base === '/dashboard/' ? `${origin}${base}student?room=${code}` : `${origin}${base}#/student?room=${code}`
}
