import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import {
  getPlatformAdminMe,
  platformAdminLogin,
  platformAdminLogout,
  type PlatformAdminAccountDto,
  type PlatformAdminLoginResponse,
} from '@/platform/api/platformAdmin'
import { tokenStore } from '@/api/tokenStore'
import { parseAccessTokenClaims } from '@/lib/accessTokenClaims'
import {
  buildDisplayName,
  buildInitials,
  isPlatformActor,
  type ActorType,
  type AuthIdentity,
  type UserAccountStatus,
} from '@/types/auth'

interface AuthContextValue {
  user: AuthIdentity | null
  isAuthenticated: boolean
  isLoading: boolean
  canClearSessions: boolean
  loginPlatformAdmin: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function readString(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

function nestedUserRecord(data: PlatformAdminLoginResponse): Record<string, unknown> | null {
  if (isRecord(data.user)) return data.user
  if (isRecord(data.admin)) return data.admin
  if (isRecord(data.platformAdmin)) return data.platformAdmin
  return null
}

/**
 * Postman only documents `data.accessToken`. Identity is assembled from optional
 * nested user fields, then JWT claims (`sub`, `email`, `actorType`).
 */
function identityFromPlatformSession(
  accessToken: string,
  data: PlatformAdminLoginResponse | null,
  emailFallback: string,
): AuthIdentity | null {
  const claims = parseAccessTokenClaims(accessToken)
  const nested = data ? nestedUserRecord(data) : null
  const firstName = readString(nested?.firstName)
  const lastName = readString(nested?.lastName)
  const email = readString(nested?.email) || claims?.email || emailFallback
  const userId =
    readString(nested?.userId) || readString(nested?.id) || claims?.sub || email

  if (!userId) return null

  const claimed = claims?.actorType
  if (claimed && !isPlatformActor(claimed)) {
    return null
  }

  const actorType: ActorType = isPlatformActor(claimed) ? claimed : 'PlatformAdmin'

  return {
    userId,
    email,
    firstName,
    lastName,
    displayName: buildDisplayName(firstName, lastName, email),
    initials: buildInitials(firstName, lastName, email),
    status: 'Active',
    emailVerified: true,
    actorType,
    organization: null,
    sessionId: data?.sessionId ?? claims?.sessionId ?? null,
    permissionsVersion: claims?.permissionsVersion ?? null,
    permissions: claims?.permissions ?? [],
    employeeId: null,
    restaurantId: null,
    branchIds: [],
    language: null,
    phone: null,
    requiresPasswordChange: false,
  }
}

function identityFromMe(
  accessToken: string,
  me: PlatformAdminAccountDto,
): AuthIdentity | null {
  const claims = parseAccessTokenClaims(accessToken)
  const email = readString(me.email) || claims?.email || ''
  const firstName = readString(me.firstName)
  const lastName = readString(me.lastName)
  const userId = readString(me.id) || claims?.sub || email
  if (!userId) return null

  const role = readString(me.role)
  const claimed = claims?.actorType || (isPlatformActor(role) ? role : undefined)
  if (claimed && !isPlatformActor(claimed)) return null
  const actorType: ActorType = isPlatformActor(claimed) ? claimed : 'PlatformAdmin'

  const statusRaw = readString(me.status)
  const status: UserAccountStatus =
    statusRaw === 'Pending' ||
    statusRaw === 'Active' ||
    statusRaw === 'Suspended' ||
    statusRaw === 'Locked' ||
    statusRaw === 'Deleted' ||
    statusRaw === 'Anonymized'
      ? statusRaw
      : 'Active'

  return {
    userId,
    email,
    firstName,
    lastName,
    displayName: buildDisplayName(firstName, lastName, email),
    initials: buildInitials(firstName, lastName, email),
    status,
    emailVerified: true,
    actorType,
    organization: null,
    sessionId: claims?.sessionId ?? null,
    permissionsVersion: claims?.permissionsVersion ?? null,
    permissions: claims?.permissions ?? [],
    employeeId: null,
    restaurantId: null,
    branchIds: [],
    language: null,
    phone: null,
    requiresPasswordChange: false,
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthIdentity | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [canClearSessions, setCanClearSessions] = useState(
    () => Boolean(tokenStore.getRefreshToken()),
  )

  const clearLocalSession = useCallback((): void => {
    tokenStore.clear()
    setUser(null)
    setCanClearSessions(false)
  }, [])

  useEffect(() => {
    let cancelled = false

    const bootstrap = async (): Promise<void> => {
      const token = tokenStore.getAccessToken()
      if (!token) {
        setCanClearSessions(Boolean(tokenStore.getRefreshToken()))
        setIsLoading(false)
        return
      }

      try {
        const me = await getPlatformAdminMe()
        if (cancelled) return
        const identity = identityFromMe(token, me)
        if (identity) {
          setUser(identity)
        } else {
          const fallback = identityFromPlatformSession(token, { accessToken: token }, '')
          if (fallback) setUser(fallback)
          else tokenStore.clear()
        }
      } catch {
        if (cancelled) return
        const identity = identityFromPlatformSession(token, { accessToken: token }, '')
        if (identity) {
          setUser(identity)
        } else {
          tokenStore.clear()
        }
      } finally {
        if (!cancelled) {
          setCanClearSessions(Boolean(tokenStore.getRefreshToken()))
          setIsLoading(false)
        }
      }
    }

    void bootstrap()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    return tokenStore.onSessionInvalidated(() => {
      setUser(null)
      setCanClearSessions(Boolean(tokenStore.getRefreshToken()))
    })
  }, [])

  const loginPlatformAdmin = useCallback(async (email: string, password: string): Promise<void> => {
    const data = await platformAdminLogin({
      email: email.trim(),
      password,
    })

    tokenStore.setTokens({
      accessToken: data.accessToken,
      refreshToken: data.refreshToken ?? null,
    })
    setCanClearSessions(Boolean(data.refreshToken))

    const identity = identityFromPlatformSession(data.accessToken, data, email.trim())
    if (!identity) {
      tokenStore.clear()
      setUser(null)
      setCanClearSessions(false)
      throw new Error('Failed to establish platform admin identity after login.')
    }

    setUser(identity)
  }, [])

  const logout = useCallback(async (): Promise<void> => {
    const refreshToken = tokenStore.getRefreshToken()
    if (refreshToken && tokenStore.getAccessToken()) {
      try {
        await platformAdminLogout(refreshToken)
      } catch {
        // Still clear locally — logout is best-effort against the server.
      }
    }
    clearLocalSession()
  }, [clearLocalSession])

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated: user !== null && isPlatformActor(user.actorType),
      isLoading,
      canClearSessions,
      loginPlatformAdmin,
      logout,
    }),
    [user, isLoading, canClearSessions, loginPlatformAdmin, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return ctx
}
