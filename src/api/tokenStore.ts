/**
 * Auth token bridge between AuthProvider and the API client.
 *
 * Access token: memory + sessionStorage for this tab.
 * Refresh token: stored when login returns one; used by
 * `POST /platform-admin/refresh` and logout. Never call restaurant
 * `POST /auth/refresh` with a platform token.
 */

const ACCESS_TOKEN_STORAGE_KEY = 'tavola-platform-access-token'
const REFRESH_TOKEN_STORAGE_KEY = 'tavola-platform-refresh-token'

let accessToken: string | null | undefined

type SessionInvalidatedListener = () => void
const sessionInvalidatedListeners = new Set<SessionInvalidatedListener>()

function readAccessTokenFromStorage(): string | null {
  try {
    return sessionStorage.getItem(ACCESS_TOKEN_STORAGE_KEY)
  } catch {
    return null
  }
}

function writeAccessTokenToStorage(token: string | null): void {
  try {
    if (token === null) {
      sessionStorage.removeItem(ACCESS_TOKEN_STORAGE_KEY)
    } else {
      sessionStorage.setItem(ACCESS_TOKEN_STORAGE_KEY, token)
    }
  } catch {
    // Storage may be unavailable (private mode / SSR); ignore.
  }
}

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
    if (accessToken === undefined) {
      accessToken = readAccessTokenFromStorage()
    }
    return accessToken
  },

  setAccessToken(token: string | null): void {
    accessToken = token
    writeAccessTokenToStorage(token)
  },

  getRefreshToken(): string | null {
    return readRefreshTokenFromStorage()
  },

  setRefreshToken(token: string | null): void {
    writeRefreshTokenToStorage(token)
  },

  setTokens(tokens: { accessToken: string; refreshToken: string | null }): void {
    accessToken = tokens.accessToken
    writeAccessTokenToStorage(tokens.accessToken)
    writeRefreshTokenToStorage(tokens.refreshToken)
  },

  clear(): void {
    accessToken = null
    writeAccessTokenToStorage(null)
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
