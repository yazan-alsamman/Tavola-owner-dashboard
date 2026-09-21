import type { ActorType, OrgRole } from '@/types/auth'
import { isOrgRole } from '@/types/auth'

/**
 * Advisory claims read from the access JWT payload for UI gating only.
 * The signature is NOT verified client-side — the backend remains enforcement.
 *
 * Login and GET /users/me do not return permissions / branchIds; those live in JWT claims
 * per backend AUTHENTICATION_ARCHITECTURE.md.
 */

export interface AccessTokenClaims {
  sub: string | null
  email: string | null
  actorType: ActorType | null
  organizationId: string | null
  orgRole: OrgRole | null
  employeeId: string | null
  restaurantId: string | null
  branchIds: string[]
  permissions: string[]
  permissionsVersion: number | null
  sessionId: string | null
  sessionVersion: number | null
}

const ACTOR_TYPES: ReadonlySet<string> = new Set([
  'User',
  'Employee',
  'OrganizationMember',
  'PlatformAdmin',
  'PlatformSupport',
])

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function readString(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null
}

function readNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function readStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.filter((item): item is string => typeof item === 'string')
}

function decodeBase64Url(input: string): string {
  const normalized = input.replace(/-/g, '+').replace(/_/g, '/')
  const pad = normalized.length % 4
  const padded = pad === 0 ? normalized : normalized + '='.repeat(4 - pad)

  const binary = atob(padded)
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0))
  return new TextDecoder().decode(bytes)
}

function isActorType(value: string): value is ActorType {
  return ACTOR_TYPES.has(value)
}

/**
 * Parse the JWT payload without verifying the signature.
 * Returns null if the token is malformed.
 */
export function parseAccessTokenClaims(accessToken: string): AccessTokenClaims | null {
  const parts = accessToken.split('.')
  if (parts.length < 2 || !parts[1]) {
    return null
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(decodeBase64Url(parts[1])) as unknown
  } catch {
    return null
  }

  if (!isRecord(parsed)) {
    return null
  }

  const actorRaw = readString(parsed.actorType)
  const orgRoleRaw = readString(parsed.orgRole)

  return {
    sub: readString(parsed.sub),
    email: readString(parsed.email),
    actorType: actorRaw && isActorType(actorRaw) ? actorRaw : null,
    organizationId: readString(parsed.organizationId),
    orgRole: orgRoleRaw && isOrgRole(orgRoleRaw) ? orgRoleRaw : null,
    employeeId: readString(parsed.employeeId),
    restaurantId: readString(parsed.restaurantId),
    branchIds: readStringArray(parsed.branchIds),
    permissions: readStringArray(parsed.permissions),
    permissionsVersion: readNumber(parsed.permissionsVersion),
    sessionId: readString(parsed.sessionId),
    sessionVersion: readNumber(parsed.sessionVersion),
  }
}
