/**
 * Canonical authenticated identity for the Tavla staff dashboard.
 * Field names and enums match the verified backend contract
 * (login DTO + JWT claims + GET /users/me profile).
 */

export type ActorType =
  | 'User'
  | 'Employee'
  | 'OrganizationMember'
  | 'PlatformAdmin'
  | 'PlatformSupport'

export function isPlatformActor(
  actorType: string | null | undefined,
): actorType is 'PlatformAdmin' | 'PlatformSupport' {
  return actorType === 'PlatformAdmin' || actorType === 'PlatformSupport'
}

export type UserAccountStatus =
  | 'Pending'
  | 'Active'
  | 'Suspended'
  | 'Locked'
  | 'Deleted'
  | 'Anonymized'

/** Organization-level roles from DATABASE_SCHEMA.md / login `organization.role`. */
export type OrgRole = 'Owner' | 'Admin' | 'Billing' | 'Staff'

export type DeviceType = 'mobile' | 'web' | 'tablet' | 'unknown'

export interface AuthOrganization {
  organizationId: string
  name: string | null
  slug: string | null
  role: OrgRole | null
}

/**
 * Frontend session identity. Profile fields come from login and/or GET /users/me.
 * Operational claims (permissions, branchIds, …) are advisory only — parsed from
 * the access JWT payload for UX gating; the server remains the enforcement point.
 */
export interface AuthIdentity {
  userId: string
  email: string
  firstName: string
  lastName: string
  displayName: string
  initials: string
  status: UserAccountStatus | null
  emailVerified: boolean | null
  actorType: ActorType
  organization: AuthOrganization | null
  sessionId: string | null
  permissionsVersion: number | null
  /** Employee permission slugs from JWT claims (advisory UI only). */
  permissions: string[]
  employeeId: string | null
  restaurantId: string | null
  branchIds: string[]
  language: string | null
  phone: string | null
  requiresPasswordChange: boolean
}

export function isOrgRole(value: string): value is OrgRole {
  return (
    value === 'Owner' ||
    value === 'Admin' ||
    value === 'Billing' ||
    value === 'Staff'
  )
}

export function buildDisplayName(firstName: string, lastName: string, email: string): string {
  const full = `${firstName.trim()} ${lastName.trim()}`.trim()
  if (full.length > 0) return full
  if (email.length > 0) return email
  return 'User'
}

export function buildInitials(firstName: string, lastName: string, email: string): string {
  const first = firstName.trim()
  const last = lastName.trim()
  if (first && last) return `${first[0]!}${last[0]!}`.toUpperCase()
  if (first.length >= 2) return first.slice(0, 2).toUpperCase()
  if (email.length >= 2) return email.slice(0, 2).toUpperCase()
  return 'U'
}
