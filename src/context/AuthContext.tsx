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
  type PlatformAdminLoginResponse,
  type PlatformAdminMeDto,
} from '@/platform/api/platformAdmin'
import { tokenStore } from '@/api/tokenStore'
import { parseAccessTokenClaims } from '@/lib/accessTokenClaims'
import {
  buildDisplayName,
  buildInitials,
  isPlatformAdminRole,
  isPlatformActor,
  type ActorType,
  type AuthIdentity,
  type PlatformAdminRole,
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

function resolvePlatformRole(
  liveRole: string | undefined,
  jwtRole: PlatformAdminRole | null,
  jwtActor: ActorType | null,
): PlatformAdminRole | null {
  if (isPlatformAdminRole(liveRole)) return liveRole
  if (jwtRole) return jwtRole
  if (isPlatformAdminRole(jwtActor)) return jwtActor
  return null
}

function toStatus(value: string): UserAccountStatus {
  if (
    value === 'Pending' ||
    value === 'Active' ||
    value === 'Suspended' ||
    value === 'Locked' ||
    value === 'Deleted' ||
    value === 'Anonymized'
  ) {
    return value
  }
  return 'Active'
}

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
  const userId = readString(nested?.userId) || claims?.sub || ''
  const platformRole = resolvePlatformRole(
    readString(nested?.role) || undefined,
    claims?.role ?? null,
    claims?.actorType ?? null,
  )
  if (!userId || !platformRole) return null

  return {
    userId,
    email,
    firstName,
    lastName,
    displayName: buildDisplayName(firstName, lastName, email),
    initials: buildInitials(firstName, lastName, email),
    status: 'Active',
    emailVerified: true,
    actorType: platformRole,
    platformRole,
    platformAdminId: readString(nested?.platformAdminId) || null,
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

function identityFromMe(accessToken: string, me: PlatformAdminMeDto): AuthIdentity | null {
  const claims = parseAccessTokenClaims(accessToken)
  const email = readString(me.email) || claims?.email || ''
  const firstName = readString(me.firstName)
  const lastName = readString(me.lastName)
  const userId = me.userId || claims?.sub || ''
  const platformRole = resolvePlatformRole(me.role, claims?.role ?? null, claims?.actorType ?? null)
  if (!userId || !platformRole) return null

  return {
    userId,
    email,
    firstName,
    lastName,
    displayName: buildDisplayName(firstName, lastName, email),
    initials: buildInitials(firstName, lastName, email),
    status: toStatus(readString(me.status)),
    emailVerified: true,
    actorType: platformRole,
    platformRole,
    platformAdminId: me.platformAdminId || null,
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
          tokenStore.clear()
          setUser(null)
        }
      } catch {
        if (cancelled) return
        tokenStore.clear()
        setUser(null)
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

    let identity: AuthIdentity | null = null
    try {
      const me = await getPlatformAdminMe()
      identity = identityFromMe(data.accessToken, me)
    } catch {
      identity = identityFromPlatformSession(data.accessToken, data, email.trim())
    }

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
      isAuthenticated: user !== null && isPlatformActor(user.platformRole ?? user.actorType),
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
