import { apiRequest } from '@/api/client'
import type { PaginatedData } from '@/api/types'
import type { PlatformAdminRole } from '@/types/auth'

export type { PlatformAdminRole }

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
  userId?: string
  platformAdminId?: string
  email?: string
  role?: string
  status?: string
  firstName?: string
  lastName?: string
  [key: string]: unknown
}

/** Postman `GET /platform-admin/me` success `data`. */
export interface PlatformAdminMeDto {
  userId: string
  platformAdminId: string
  email?: string
  firstName?: string
  lastName?: string
  role: PlatformAdminRole
  status?: string
  platformAdminCreatedAt?: string
}

function asObject(value: unknown): Record<string, unknown> {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>
  }
  return {}
}

function readOptionalString(record: Record<string, unknown>, key: string): string | undefined {
  const value = record[key]
  return typeof value === 'string' && value.length > 0 ? value : undefined
}

function readFiniteNumber(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) return parsed
  }
  return 0
}

function readNullableString(record: Record<string, unknown>, key: string): string | null {
  const value = record[key]
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

export function normalizeRevenueReport(raw: unknown): RevenueReportDto {
  const record = asObject(raw)
  const bucketsRaw = Array.isArray(record.buckets) ? record.buckets : []
  return {
    groupBy: readOptionalString(record, 'groupBy') ?? '',
    buckets: bucketsRaw.map((item) => {
      const row = asObject(item)
      return {
        key: readOptionalString(row, 'key') ?? '',
        currency: readOptionalString(row, 'currency')?.trim() ?? '',
        recordedCount: readFiniteNumber(row.recordedCount),
        recordedTotal: readFiniteNumber(row.recordedTotal),
        reversedCount: readFiniteNumber(row.reversedCount),
        reversedTotal: readFiniteNumber(row.reversedTotal),
      }
    }),
  }
}

export function normalizeRevenueExport(raw: unknown): RevenueExportDto {
  const record = asObject(raw)
  const rowsRaw = Array.isArray(record.rows) ? record.rows : []
  return {
    total: readFiniteNumber(record.total),
    rows: rowsRaw.map((item) => {
      const row = asObject(item)
      return {
        id: readOptionalString(row, 'id') ?? '',
        restaurantId: readOptionalString(row, 'restaurantId') ?? '',
        organizationId: readOptionalString(row, 'organizationId') ?? '',
        customerIdentityKey: readOptionalString(row, 'customerIdentityKey') ?? '',
        createdVia: readOptionalString(row, 'createdVia') ?? '',
        status: readOptionalString(row, 'status') ?? '',
        feeAmount: readFiniteNumber(row.feeAmount),
        feeCurrency: readOptionalString(row, 'feeCurrency')?.trim() ?? '',
        recordedAt: readOptionalString(row, 'recordedAt') ?? '',
        reversedAt: readNullableString(row, 'reversedAt'),
      }
    }),
  }
}

export function normalizePlatformAdminMe(raw: unknown): PlatformAdminMeDto {
  const record = asObject(raw)
  const userId = readOptionalString(record, 'userId') ?? ''
  const platformAdminId = readOptionalString(record, 'platformAdminId') ?? ''
  const roleRaw = readOptionalString(record, 'role')
  const role: PlatformAdminRole = roleRaw === 'PlatformSupport' ? 'PlatformSupport' : 'PlatformAdmin'
  return {
    userId,
    platformAdminId,
    email: readOptionalString(record, 'email'),
    firstName: readOptionalString(record, 'firstName'),
    lastName: readOptionalString(record, 'lastName'),
    role,
    status: readOptionalString(record, 'status'),
    platformAdminCreatedAt: readOptionalString(record, 'platformAdminCreatedAt'),
  }
}

export function accountRecordId(row: unknown): string {
  const record = asObject(row)
  return readOptionalString(record, 'id') ?? readOptionalString(record, 'userId') ?? ''
}

/**
 * Accounts list/detail return `userId` (Postman), not `id`.
 * Normalize so pickers and tables always have a stable `id` for keys and targetUserId.
 */
export function normalizePlatformUserAccount(raw: unknown): PlatformUserAccountDto {
  const record = asObject(raw)
  const id = accountRecordId(record)
  return {
    ...(record as PlatformUserAccountDto),
    id,
    userId: readOptionalString(record, 'userId') ?? id,
    email: readOptionalString(record, 'email'),
    status: readOptionalString(record, 'status'),
    accountType: readOptionalString(record, 'accountType'),
    firstName: readOptionalString(record, 'firstName'),
    lastName: readOptionalString(record, 'lastName'),
    phone: readOptionalString(record, 'phone'),
    deletedAt: readNullableString(record, 'deletedAt'),
  }
}

function normalizeAccountPage(
  raw: PaginatedData<PlatformUserAccountDto>,
): PaginatedData<PlatformUserAccountDto> {
  return {
    ...raw,
    items: (raw.items ?? []).map((item) => normalizePlatformUserAccount(item)),
  }
}

export function adminRecordId(row: unknown): string {
  const record = asObject(row)
  return readOptionalString(record, 'id') ?? readOptionalString(record, 'platformAdminId') ?? ''
}

/** Postman `GET /platform-admin/revenue/report` bucket. One currency per bucket. */
export interface RevenueBucketDto {
  key: string
  /** Empty when the API omits currency. Never treated as another currency. */
  currency: string
  recordedCount: number
  recordedTotal: number
  reversedCount: number
  reversedTotal: number
}

/** Postman `GET /platform-admin/revenue/report` `data`. */
export interface RevenueReportDto {
  groupBy: string
  buckets: RevenueBucketDto[]
}

/** Postman `GET /platform-admin/revenue/export` row. Fee snapshot only. */
export interface RevenueExportRowDto {
  id: string
  restaurantId: string
  organizationId: string
  customerIdentityKey: string
  createdVia: string
  status: string
  feeAmount: number
  feeCurrency: string
  recordedAt: string
  reversedAt: string | null
}

/** Postman `GET /platform-admin/revenue/export` `data`. */
export interface RevenueExportDto {
  total: number
  rows: RevenueExportRowDto[]
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
): Promise<PlatformAdminMeDto> {
  const raw = await apiRequest<unknown>('/platform-admin/me', { signal })
  return normalizePlatformAdminMe(raw)
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
        q: params.q?.trim() || undefined,
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
        q: params.q?.trim() || undefined,
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
  /** Present on API payloads; same value as `id` after normalize. */
  userId?: string
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
  const raw = await apiRequest<PaginatedData<PlatformUserAccountDto>>('/platform-admin/accounts', {
    query: {
      q: params.q?.trim() || undefined,
      status: params.status || undefined,
      accountType: params.accountType || undefined,
      page: params.page ?? 1,
      limit: params.pageSize ?? 20,
    },
    signal,
  })
  return normalizeAccountPage(raw)
}

export async function getPlatformAccount(
  accountId: string,
  signal?: AbortSignal,
): Promise<PlatformUserAccountDto> {
  const raw = await apiRequest<PlatformUserAccountDto>(`/platform-admin/accounts/${accountId}`, {
    signal,
  })
  return normalizePlatformUserAccount(raw)
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
  const raw = await apiRequest<unknown>('/platform-admin/revenue/report', {
    query: {
      from: toPlatformIsoDateTime(params.from, 'start'),
      to: toPlatformIsoDateTime(params.to, 'end'),
      groupBy: params.groupBy,
      restaurantId: params.restaurantId,
      organizationId: params.organizationId,
    },
    signal,
  })
  return normalizeRevenueReport(raw)
}

export async function exportPlatformRevenue(
  params: {
    from: string
    to: string
    restaurantId?: string
    organizationId?: string
  },
  signal?: AbortSignal,
): Promise<RevenueExportDto> {
  const raw = await apiRequest<unknown>('/platform-admin/revenue/export', {
    query: {
      from: toPlatformIsoDateTime(params.from, 'start'),
      to: toPlatformIsoDateTime(params.to, 'end'),
      restaurantId: params.restaurantId,
      organizationId: params.organizationId,
    },
    signal,
  })
  return normalizeRevenueExport(raw)
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
    targetType?: string
    targetId?: string
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
      targetType: params.targetType,
      targetId: params.targetId,
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
      label: params.label?.trim() || undefined,
      id: params.id?.trim() || undefined,
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
