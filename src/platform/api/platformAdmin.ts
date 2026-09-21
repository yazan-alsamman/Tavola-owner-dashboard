import { apiRequest } from '@/api/client'
import type { PaginatedData } from '@/api/types'

/** Platform Admin login — isolated issuer (Postman `POST /platform-admin/login`). */
export interface PlatformAdminLoginRequest {
  email: string
  password: string
}

/**
 * Postman captures `accessToken`; refresh may be absent for this issuer.
 * Keep fields flexible and read what the envelope returns.
 */
export interface PlatformAdminLoginResponse {
  accessToken: string
  refreshToken?: string
  accessTokenExpiresAt?: string
  refreshTokenExpiresAt?: string
  sessionId?: string
  actorType?: string
  user?: {
    userId?: string
    email?: string
    firstName?: string
    lastName?: string
  }
  [key: string]: unknown
}

export interface PlatformDashboardDto {
  generatedAt?: string
  restaurants?: Record<string, unknown>
  organizations?: Record<string, unknown>
  subscriptions?: Record<string, unknown>
  acquisition?: Record<string, unknown>
  messaging?: Record<string, unknown>
  [key: string]: unknown
}

export interface PlatformRestaurantLookupDto {
  id: string
  organizationId?: string
  name?: string
  slug?: string
  status?: string
  deletedAt?: string | null
  [key: string]: unknown
}

export interface PlatformOrganizationLookupDto {
  id: string
  name?: string
  slug?: string
  status?: string
  deletedAt?: string | null
  [key: string]: unknown
}

export interface PlatformAdminAccountDto {
  id: string
  email?: string
  role?: string
  status?: string
  firstName?: string
  lastName?: string
  [key: string]: unknown
}

export interface RevenueReportDto {
  groupBy: string
  buckets: Array<{
    key: string
    currency?: string
    recordedCount?: number
    recordedTotal?: number
    reversedCount?: number
    reversedTotal?: number
    [key: string]: unknown
  }>
  [key: string]: unknown
}

export type RevenueGroupBy =
  | 'day'
  | 'week'
  | 'month'
  | 'quarter'
  | 'year'
  | 'restaurant'
  | 'organization'
  | 'source'

export interface ProvisionRestaurantOwnerRequest {
  email: string
  password: string
  firstName: string
  lastName: string
  organizationName: string
  consents: {
    termsOfService: boolean
    privacyPolicy: boolean
    marketing: boolean
  }
}

/**
 * Postman requires ISO date-time for dashboard / revenue / audit `from`/`to`.
 * Date inputs in the UI are `YYYY-MM-DD`; pass those through unchanged here.
 */
const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/

export function toPlatformIsoDateTime(value: string, bound: 'start' | 'end'): string {
  const trimmed = value.trim()
  if (DATE_ONLY.test(trimmed)) {
    return bound === 'start' ? `${trimmed}T00:00:00.000Z` : `${trimmed}T23:59:59.999Z`
  }
  return trimmed
}

export async function platformAdminLogin(
  body: PlatformAdminLoginRequest,
): Promise<PlatformAdminLoginResponse> {
  const data = await apiRequest<PlatformAdminLoginResponse>('/platform-admin/login', {
    method: 'POST',
    auth: false,
    body: {
      email: body.email,
      password: body.password,
    },
  })

  if (!data || typeof data.accessToken !== 'string' || data.accessToken.length === 0) {
    throw new Error('Platform login succeeded without an access token.')
  }

  return data
}

/** Rotate platform admin session — Postman `POST /platform-admin/refresh`. */
export async function platformAdminRefresh(
  refreshToken: string,
): Promise<PlatformAdminLoginResponse> {
  const data = await apiRequest<PlatformAdminLoginResponse>('/platform-admin/refresh', {
    method: 'POST',
    auth: false,
    body: { refreshToken },
  })

  if (!data || typeof data.accessToken !== 'string' || data.accessToken.length === 0) {
    throw new Error('Platform refresh succeeded without an access token.')
  }

  return data
}

/** End platform admin session — Postman `POST /platform-admin/logout` (204). */
export async function platformAdminLogout(refreshToken: string): Promise<void> {
  await apiRequest('/platform-admin/logout', {
    method: 'POST',
    body: { refreshToken },
  })
}

/** Current platform admin — Postman `GET /platform-admin/me`. */
export async function getPlatformAdminMe(
  signal?: AbortSignal,
): Promise<PlatformAdminAccountDto> {
  return apiRequest<PlatformAdminAccountDto>('/platform-admin/me', { signal })
}

export async function getPlatformDashboard(
  from: string,
  to: string,
  signal?: AbortSignal,
): Promise<PlatformDashboardDto> {
  return apiRequest<PlatformDashboardDto>('/platform-admin/dashboard', {
    query: {
      from: toPlatformIsoDateTime(from, 'start'),
      to: toPlatformIsoDateTime(to, 'end'),
    },
    signal,
  })
}

export type PlatformRestaurantStatus = 'Active' | 'Suspended' | 'Deleted'

export interface CreatePlatformRestaurantRequest {
  organizationId: string
  name: string
  slug: string
  description?: string
  cuisineType?: string
  priceLevel?: number
}

export async function searchPlatformRestaurants(
  params: {
    q?: string
    status?: PlatformRestaurantStatus | ''
    page?: number
    pageSize?: number
  } = {},
  signal?: AbortSignal,
): Promise<PaginatedData<PlatformRestaurantLookupDto>> {
  return apiRequest<PaginatedData<PlatformRestaurantLookupDto>>(
    '/platform-admin/restaurants',
    {
      query: {
        q: params.q ?? '',
        status: params.status || undefined,
        page: params.page ?? 1,
        limit: params.pageSize ?? 20,
      },
      signal,
    },
  )
}

export async function createPlatformRestaurant(
  body: CreatePlatformRestaurantRequest,
): Promise<PlatformRestaurantLookupDto> {
  return apiRequest<PlatformRestaurantLookupDto>('/platform-admin/restaurants', {
    method: 'POST',
    body: {
      organizationId: body.organizationId,
      name: body.name,
      slug: body.slug,
      ...(body.description ? { description: body.description } : {}),
      ...(body.cuisineType ? { cuisineType: body.cuisineType } : {}),
      ...(body.priceLevel !== undefined ? { priceLevel: body.priceLevel } : {}),
    },
  })
}

export async function getPlatformRestaurant(
  restaurantId: string,
  signal?: AbortSignal,
): Promise<PlatformRestaurantLookupDto> {
  return apiRequest<PlatformRestaurantLookupDto>(
    `/platform-admin/restaurants/${restaurantId}`,
    { signal },
  )
}

export async function suspendPlatformRestaurant(restaurantId: string): Promise<unknown> {
  return apiRequest(`/platform-admin/restaurants/${restaurantId}/suspend`, {
    method: 'POST',
  })
}

export async function reactivatePlatformRestaurant(restaurantId: string): Promise<unknown> {
  return apiRequest(`/platform-admin/restaurants/${restaurantId}/reactivate`, {
    method: 'POST',
  })
}

export async function deletePlatformRestaurant(restaurantId: string): Promise<unknown> {
  return apiRequest(`/platform-admin/restaurants/${restaurantId}/delete`, {
    method: 'POST',
  })
}

export async function restorePlatformRestaurant(restaurantId: string): Promise<unknown> {
  return apiRequest(`/platform-admin/restaurants/${restaurantId}/restore`, {
    method: 'POST',
  })
}

export type PlatformOrganizationStatus = 'Active' | 'Suspended' | 'Deleted'

export async function searchPlatformOrganizations(
  params: {
    q?: string
    status?: PlatformOrganizationStatus | ''
    page?: number
    pageSize?: number
  } = {},
  signal?: AbortSignal,
): Promise<PaginatedData<PlatformOrganizationLookupDto>> {
  return apiRequest<PaginatedData<PlatformOrganizationLookupDto>>(
    '/platform-admin/organizations',
    {
      query: {
        q: params.q ?? '',
        status: params.status || undefined,
        page: params.page ?? 1,
        limit: params.pageSize ?? 20,
      },
      signal,
    },
  )
}

export async function getPlatformOrganization(
  organizationId: string,
  signal?: AbortSignal,
): Promise<PlatformOrganizationLookupDto> {
  return apiRequest<PlatformOrganizationLookupDto>(
    `/platform-admin/organizations/${organizationId}`,
    { signal },
  )
}

export async function suspendPlatformOrganization(organizationId: string): Promise<unknown> {
  return apiRequest(`/platform-admin/organizations/${organizationId}/suspend`, {
    method: 'POST',
  })
}

export async function reactivatePlatformOrganization(
  organizationId: string,
): Promise<unknown> {
  return apiRequest(`/platform-admin/organizations/${organizationId}/reactivate`, {
    method: 'POST',
  })
}

export async function deletePlatformOrganization(organizationId: string): Promise<unknown> {
  return apiRequest(`/platform-admin/organizations/${organizationId}/delete`, {
    method: 'POST',
  })
}

export async function restorePlatformOrganization(organizationId: string): Promise<unknown> {
  return apiRequest(`/platform-admin/organizations/${organizationId}/restore`, {
    method: 'POST',
  })
}

export async function transferPlatformOrganizationOwnership(
  organizationId: string,
  body: { newOwnerUserId: string },
): Promise<unknown> {
  return apiRequest(
    `/platform-admin/organizations/${organizationId}/transfer-ownership`,
    { method: 'POST', body: { newOwnerUserId: body.newOwnerUserId } },
  )
}

export interface PlatformUserAccountDto {
  id: string
  email?: string
  status?: string
  accountType?: string
  firstName?: string
  lastName?: string
  phone?: string
  deletedAt?: string | null
  [key: string]: unknown
}

export async function searchPlatformAccounts(
  params: {
    q?: string
    status?: string
    accountType?: string
    page?: number
    pageSize?: number
  } = {},
  signal?: AbortSignal,
): Promise<PaginatedData<PlatformUserAccountDto>> {
  return apiRequest<PaginatedData<PlatformUserAccountDto>>('/platform-admin/accounts', {
    query: {
      q: params.q ?? '',
      status: params.status || undefined,
      accountType: params.accountType || undefined,
      page: params.page ?? 1,
      limit: params.pageSize ?? 20,
    },
    signal,
  })
}

export async function getPlatformAccount(
  accountId: string,
  signal?: AbortSignal,
): Promise<PlatformUserAccountDto> {
  return apiRequest<PlatformUserAccountDto>(`/platform-admin/accounts/${accountId}`, {
    signal,
  })
}

export async function forceLogoutPlatformAccount(accountId: string): Promise<unknown> {
  return apiRequest(`/platform-admin/accounts/${accountId}/force-logout`, {
    method: 'POST',
  })
}

export async function resetPlatformAccountCredentials(
  accountId: string,
  body: { newPassword: string },
): Promise<unknown> {
  return apiRequest(`/platform-admin/accounts/${accountId}/reset-credentials`, {
    method: 'POST',
    body: { newPassword: body.newPassword },
  })
}

export async function disablePlatformAccountLogin(accountId: string): Promise<unknown> {
  return apiRequest(`/platform-admin/accounts/${accountId}/disable-login`, {
    method: 'POST',
  })
}

export async function enablePlatformAccountLogin(accountId: string): Promise<unknown> {
  return apiRequest(`/platform-admin/accounts/${accountId}/enable-login`, {
    method: 'POST',
  })
}

export async function listPlatformAdmins(
  params: { page?: number; pageSize?: number } = {},
  signal?: AbortSignal,
): Promise<PaginatedData<PlatformAdminAccountDto>> {
  return apiRequest<PaginatedData<PlatformAdminAccountDto>>('/platform-admin/admins', {
    query: {
      page: params.page ?? 1,
      limit: params.pageSize ?? 20,
    },
    signal,
  })
}

export async function getPlatformAdmin(
  adminId: string,
  signal?: AbortSignal,
): Promise<PlatformAdminAccountDto> {
  return apiRequest<PlatformAdminAccountDto>(`/platform-admin/admins/${adminId}`, {
    signal,
  })
}

export type PlatformAdminRole = 'PlatformAdmin' | 'PlatformSupport'

export interface CreatePlatformAdminRequest {
  email: string
  password: string
  firstName: string
  lastName: string
  role: PlatformAdminRole
}

export async function createPlatformAdmin(
  body: CreatePlatformAdminRequest,
): Promise<PlatformAdminAccountDto> {
  return apiRequest<PlatformAdminAccountDto>('/platform-admin/admins', {
    method: 'POST',
    body: {
      email: body.email,
      password: body.password,
      firstName: body.firstName,
      lastName: body.lastName,
      role: body.role,
    },
  })
}

export async function updatePlatformAdminRole(
  adminId: string,
  body: { role: PlatformAdminRole },
): Promise<PlatformAdminAccountDto> {
  return apiRequest<PlatformAdminAccountDto>(`/platform-admin/admins/${adminId}`, {
    method: 'PATCH',
    body: { role: body.role },
  })
}

export async function deactivatePlatformAdmin(adminId: string): Promise<unknown> {
  return apiRequest(`/platform-admin/admins/${adminId}/deactivate`, {
    method: 'POST',
  })
}

export async function reactivatePlatformAdmin(adminId: string): Promise<unknown> {
  return apiRequest(`/platform-admin/admins/${adminId}/reactivate`, {
    method: 'POST',
  })
}

export async function getPlatformRevenueReport(
  params: {
    from: string
    to: string
    groupBy: RevenueGroupBy
    restaurantId?: string
    organizationId?: string
  },
  signal?: AbortSignal,
): Promise<RevenueReportDto> {
  return apiRequest<RevenueReportDto>('/platform-admin/revenue/report', {
    query: {
      from: toPlatformIsoDateTime(params.from, 'start'),
      to: toPlatformIsoDateTime(params.to, 'end'),
      groupBy: params.groupBy,
      restaurantId: params.restaurantId,
      organizationId: params.organizationId,
    },
    signal,
  })
}

export async function exportPlatformRevenue(
  params: { from: string; to: string },
  signal?: AbortSignal,
): Promise<unknown> {
  return apiRequest('/platform-admin/revenue/export', {
    query: {
      from: toPlatformIsoDateTime(params.from, 'start'),
      to: toPlatformIsoDateTime(params.to, 'end'),
    },
    signal,
  })
}

export async function listPlatformAcquisitions(
  params: { restaurantId: string; page?: number; pageSize?: number },
  signal?: AbortSignal,
): Promise<PaginatedData<Record<string, unknown>>> {
  return apiRequest('/platform-admin/acquisitions', {
    query: {
      restaurantId: params.restaurantId,
      page: params.page ?? 1,
      limit: params.pageSize ?? 20,
    },
    signal,
  })
}

export async function listPlatformAuditLogs(
  params: {
    from: string
    to: string
    page?: number
    pageSize?: number
    actorId?: string
    organizationId?: string
    action?: string
  },
  signal?: AbortSignal,
): Promise<PaginatedData<Record<string, unknown>>> {
  return apiRequest('/platform-admin/audit-logs', {
    query: {
      from: toPlatformIsoDateTime(params.from, 'start'),
      to: toPlatformIsoDateTime(params.to, 'end'),
      page: params.page ?? 1,
      limit: params.pageSize ?? 20,
      actorId: params.actorId,
      organizationId: params.organizationId,
      action: params.action,
    },
    signal,
  })
}

export async function listPlatformPricingRules(
  params: { label?: string; id?: string; page?: number; pageSize?: number } = {},
  signal?: AbortSignal,
): Promise<PaginatedData<Record<string, unknown>>> {
  return apiRequest('/platform-admin/pricing/rules', {
    query: {
      label: params.label ?? '',
      id: params.id ?? '',
      page: params.page ?? 1,
      limit: params.pageSize ?? 20,
    },
    signal,
  })
}

export async function listPlatformPlans(
  signal?: AbortSignal,
): Promise<PaginatedData<Record<string, unknown>> | Record<string, unknown>[]> {
  return apiRequest('/platform-admin/plans', { signal })
}

export async function getPlatformAcquisition(
  acquisitionId: string,
  signal?: AbortSignal,
): Promise<Record<string, unknown>> {
  return apiRequest(`/platform-admin/acquisitions/${acquisitionId}`, { signal })
}

export async function recordPlatformAcquisitionManual(body: {
  restaurantId: string
  reason: string
  userId?: string
  reservationGuestId?: string
}): Promise<Record<string, unknown>> {
  return apiRequest('/platform-admin/acquisitions/manual', {
    method: 'POST',
    body: {
      restaurantId: body.restaurantId,
      reason: body.reason,
      ...(body.userId ? { userId: body.userId } : {}),
      ...(body.reservationGuestId ? { reservationGuestId: body.reservationGuestId } : {}),
    },
  })
}

export async function reversePlatformAcquisition(
  acquisitionId: string,
  body: { reason: string },
): Promise<Record<string, unknown>> {
  return apiRequest(`/platform-admin/acquisitions/${acquisitionId}/reverse`, {
    method: 'POST',
    body: { reason: body.reason },
  })
}

export type PricingScopeType = 'Platform' | 'Organization' | 'Restaurant'

export interface ActivatePricingRuleRequest {
  scopeType: PricingScopeType
  scopeId?: string
  feeType: 'Flat'
  flatAmount: number
  flatCurrency: string
  effectiveFrom: string
  label: string
  supersedesRuleId?: string
}

export async function activatePlatformPricingRule(
  body: ActivatePricingRuleRequest,
): Promise<Record<string, unknown>> {
  return apiRequest('/platform-admin/pricing/rules', {
    method: 'POST',
    body: {
      scopeType: body.scopeType,
      feeType: body.feeType,
      flatAmount: body.flatAmount,
      flatCurrency: body.flatCurrency,
      effectiveFrom: toPlatformIsoDateTime(body.effectiveFrom, 'start'),
      label: body.label,
      ...(body.scopeType === 'Platform' ? {} : { scopeId: body.scopeId }),
      ...(body.supersedesRuleId ? { supersedesRuleId: body.supersedesRuleId } : {}),
    },
  })
}

export async function simulatePlatformPricing(
  body: {
    restaurantId: string
    proposedFlatAmount: number
    proposedFlatCurrency: string
    lookbackDays?: number
  },
  signal?: AbortSignal,
): Promise<Record<string, unknown>> {
  return apiRequest('/platform-admin/pricing/simulate', {
    method: 'POST',
    body: {
      restaurantId: body.restaurantId,
      proposedFlatAmount: body.proposedFlatAmount,
      proposedFlatCurrency: body.proposedFlatCurrency,
      ...(body.lookbackDays !== undefined ? { lookbackDays: body.lookbackDays } : {}),
    },
    signal,
  })
}

export async function getOrganizationSubscription(
  organizationId: string,
  signal?: AbortSignal,
): Promise<Record<string, unknown>> {
  return apiRequest(`/platform-admin/organizations/${organizationId}/subscription`, {
    signal,
  })
}

export async function assignOrganizationSubscription(
  organizationId: string,
  body: { planId: string },
): Promise<Record<string, unknown>> {
  return apiRequest(`/platform-admin/organizations/${organizationId}/subscription`, {
    method: 'POST',
    body: { planId: body.planId },
  })
}

export async function cancelOrganizationSubscription(
  organizationId: string,
): Promise<unknown> {
  return apiRequest(`/platform-admin/organizations/${organizationId}/subscription/cancel`, {
    method: 'POST',
  })
}

export async function suspendOrganizationSubscription(
  organizationId: string,
): Promise<unknown> {
  return apiRequest(`/platform-admin/organizations/${organizationId}/subscription/suspend`, {
    method: 'POST',
  })
}

export async function reactivateOrganizationSubscription(
  organizationId: string,
): Promise<unknown> {
  return apiRequest(`/platform-admin/organizations/${organizationId}/subscription/reactivate`, {
    method: 'POST',
  })
}

export async function provisionRestaurantOwner(
  body: ProvisionRestaurantOwnerRequest,
): Promise<Record<string, unknown>> {
  return apiRequest('/platform-admin/restaurant-owners', {
    method: 'POST',
    body,
  })
}

export interface PlatformNotificationBroadcastDto {
  id: string
  title?: string
  body?: string
  status?: string
  senderType?: string
  totalRecipients?: number
  createdAt?: string
  [key: string]: unknown
}

export async function listPlatformNotifications(
  params: {
    status?: string
    senderType?: string
    page?: number
    pageSize?: number
  } = {},
  signal?: AbortSignal,
): Promise<PaginatedData<PlatformNotificationBroadcastDto>> {
  return apiRequest<PaginatedData<PlatformNotificationBroadcastDto>>(
    '/platform-admin/notifications',
    {
      query: {
        status: params.status || undefined,
        senderType: params.senderType || undefined,
        page: params.page ?? 1,
        limit: params.pageSize ?? 20,
      },
      signal,
    },
  )
}

export async function broadcastPlatformNotification(body: {
  title: string
  body: string
}): Promise<{ broadcastId: string; totalRecipients: number }> {
  return apiRequest('/platform-admin/notifications/broadcast', {
    method: 'POST',
    body,
  })
}

export async function sendPlatformNotification(body: {
  targetUserId: string
  title: string
  body: string
}): Promise<{ notificationId?: string }> {
  return apiRequest('/platform-admin/notifications', {
    method: 'POST',
    body: {
      targetUserId: body.targetUserId,
      title: body.title,
      body: body.body,
    },
  })
}
