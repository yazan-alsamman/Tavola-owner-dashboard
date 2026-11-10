/**
 * Auth token bridge between AuthProvider and the API client.
 *
 * Access token: memory only, never written to storage, so a script injected
 * into the page cannot lift a live platform token from sessionStorage. A page
 * reload gets a fresh one from the refresh token.
 * Refresh token: sessionStorage for this tab; used by
 * `POST /platform-admin/refresh` and logout. Never call restaurant
 * `POST /auth/refresh` with a platform token.
 */

/** Earlier builds kept the access token here; it is removed on load. */
const LEGACY_ACCESS_TOKEN_STORAGE_KEY = 'tavola-platform-access-token'
const REFRESH_TOKEN_STORAGE_KEY = 'tavola-platform-refresh-token'

let accessToken: string | null = null

try {
  sessionStorage.removeItem(LEGACY_ACCESS_TOKEN_STORAGE_KEY)
} catch {
  // Storage may be unavailable (private mode / SSR); ignore.
}

type SessionInvalidatedListener = () => void
const sessionInvalidatedListeners = new Set<SessionInvalidatedListener>()

function readRefreshTokenFromStorage(): string | null {
  try {
    const fromSession = sessionStorage.getItem(REFRESH_TOKEN_STORAGE_KEY)
    if (fromSession) return fromSession

    const fromLocal = localStorage.getItem(REFRESH_TOKEN_STORAGE_KEY)
    if (fromLocal) {
      sessionStorage.setItem(REFRESH_TOKEN_STORAGE_KEY, fromLocal)
      localStorage.removeItem(REFRESH_TOKEN_STORAGE_KEY)
      return fromLocal
    }

    return null
  } catch {
    return null
  }
}

function writeRefreshTokenToStorage(token: string | null): void {
  try {
    if (token === null) {
      sessionStorage.removeItem(REFRESH_TOKEN_STORAGE_KEY)
      localStorage.removeItem(REFRESH_TOKEN_STORAGE_KEY)
    } else {
      sessionStorage.setItem(REFRESH_TOKEN_STORAGE_KEY, token)
      localStorage.removeItem(REFRESH_TOKEN_STORAGE_KEY)
    }
  } catch {
    // Storage may be unavailable (private mode / SSR); ignore.
  }
}

export const tokenStore = {
  getAccessToken(): string | null {
    return accessToken
  },

  setAccessToken(token: string | null): void {
    accessToken = token
  },

  getRefreshToken(): string | null {
    return readRefreshTokenFromStorage()
  },

  setRefreshToken(token: string | null): void {
    writeRefreshTokenToStorage(token)
  },

  setTokens(tokens: { accessToken: string; refreshToken: string | null }): void {
    accessToken = tokens.accessToken
    writeRefreshTokenToStorage(tokens.refreshToken)
  },

  clear(): void {
    accessToken = null
    writeRefreshTokenToStorage(null)
  },

  /**
   * Subscribe to forced session invalidation (unrecoverable 401).
   * AuthProvider clears UI auth state on this signal.
   */
  onSessionInvalidated(listener: SessionInvalidatedListener): () => void {
    sessionInvalidatedListeners.add(listener)
    return () => {
      sessionInvalidatedListeners.delete(listener)
    }
  },

  notifySessionInvalidated(): void {
    for (const listener of sessionInvalidatedListeners) {
      listener()
    }
  },
}
