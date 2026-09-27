/*
 * Google sign-in through Google Identity Services (accounts.google.com),
 * which avoids Firebase's own sign-in window on studentpoll-a9e39.firebaseapp.com
 * (blocked by some school web filters). The resulting Google access token is
 * handed to Firebase with signInWithCredential, so the Firebase account and
 * data are the same either way.
 *
 * Needs https://nagasakimark.github.io listed under "Authorized JavaScript
 * origins" on the project's OAuth client (docs/firebase/SETUP.md).
 */

/** The Firebase project's auto-created web OAuth client (public, like the API key). */
export const GOOGLE_CLIENT_ID = '457862393597-u8ha6hceh30mt3440f86ubqhrnbj8ikl.apps.googleusercontent.com'

interface TokenResponse {
  access_token?: string
  error?: string
  error_description?: string
}
interface TokenClient {
  requestAccessToken: (o?: { prompt?: string }) => void
}
interface Gis {
  accounts: {
    oauth2: {
      initTokenClient: (config: {
        client_id: string
        scope: string
        prompt?: string
        callback: (r: TokenResponse) => void
        error_callback?: (e: { type: string; message?: string }) => void
      }) => TokenClient
    }
  }
}

let loading: Promise<Gis> | null = null

/** Load Google's sign-in script (once). Call early so the window opens straight from the click. */
export function loadGis(): Promise<Gis> {
  const w = window as unknown as { google?: Gis }
  if (w.google?.accounts?.oauth2) return Promise.resolve(w.google)
  loading ??= new Promise<Gis>((resolve, reject) => {
    const s = document.createElement('script')
    s.src = 'https://accounts.google.com/gsi/client'
    s.async = true
    s.onload = () => (w.google?.accounts?.oauth2 ? resolve(w.google) : reject(gisError('script', 'Google sign-in didn’t load.')))
    s.onerror = () => {
      loading = null
      s.remove()
      reject(gisError('script', 'Couldn’t reach accounts.google.com.'))
    }
    document.head.appendChild(s)
  })
  return loading
}

const gisError = (type: string, message: string) => Object.assign(new Error(message), { code: `gis/${type}` })

/** Open Google's account chooser and return an access token for the chosen account. */
export async function googleAccessToken(): Promise<string> {
  const gis = await loadGis()
  return new Promise((resolve, reject) => {
    const client = gis.accounts.oauth2.initTokenClient({
      client_id: GOOGLE_CLIENT_ID,
      scope: 'openid email profile',
      prompt: 'select_account',
      callback: (r) =>
        r.access_token ? resolve(r.access_token) : reject(gisError(r.error ?? 'failed', r.error_description ?? 'Google sign-in failed.')),
      error_callback: (e) => reject(gisError(e.type, e.message ?? 'The Google sign-in window closed.')),
    })
    client.requestAccessToken()
  })
}
