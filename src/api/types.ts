/**
 * Shared API contract types for the Tavla backend envelope.
 * Backend owns these shapes — see ../back/docs/API_GUIDELINES.md.
 */

/** Stable application error codes from the backend contract. */
export type ApiErrorCode =
  | 'AUTH_INVALID_TOKEN'
  | 'AUTH_EXPIRED_TOKEN'
  | 'AUTH_INVALID_CREDENTIALS'
  | 'AUTH_INVALID_REFRESH_TOKEN'
  | 'AUTH_EMAIL_NOT_VERIFIED'
  | 'AUTH_ACCOUNT_LOCKED'
  | 'AUTH_ACCOUNT_SUSPENDED'
  | 'AUTH_PASSWORD_REUSED'
  | 'AUTH_TOO_MANY_SESSIONS'
  | 'AUTH_SESSION_NOT_FOUND'
  | 'CONFLICT'
  | 'RATE_LIMIT_EXCEEDED'
  | 'RESERVATION_CONFLICT'
  | 'RESERVATION_RESCHEDULE_WINDOW_EXPIRED'
  | 'PARTY_SIZE_EXCEEDS_CAPACITY'
  | 'TABLE_UNAVAILABLE'
  | 'TABLE_MERGE_CONFLICT'
  | 'BRANCH_HAS_FUTURE_RESERVATIONS'
  | 'RESTAURANT_NOT_FOUND'
  | 'RESTAURANT_SUSPENDED'
  | 'ORGANIZATION_LIMIT_EXCEEDED'
  | 'GALLERY_LIMIT_EXCEEDED'
  | 'EMPLOYEE_BRANCH_NOT_ASSIGNED'
  | 'TENANT_CONTEXT_MISSING'
  | 'IDEMPOTENCY_KEY_CONFLICT'
  | 'VALIDATION_ERROR'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'UNKNOWN_ERROR'
  | 'FILE_TOO_LARGE'
  | 'UNSUPPORTED_FILE_TYPE'
  | 'INVALID_FILE'
  | 'STORAGE_UNAVAILABLE'
  | (string & {})

export interface ApiSuccessEnvelope<T> {
  success: true
  message: string
  data: T
  meta: Record<string, unknown>
}

export interface ApiErrorEnvelope {
  success: false
  message: string
  code: ApiErrorCode
  errors: unknown[]
  timestamp: string
  path: string
}

export type ApiEnvelope<T> = ApiSuccessEnvelope<T> | ApiErrorEnvelope

/**
 * Paginated list payload as returned inside envelope `data`.
 * Confirmed against live Swagger / favorites list shape — envelope `meta` is typically {}.
 */
export interface PaginatedData<T> {
  items: T[]
  page: number
  /** Older payloads use `limit`; Postman uses `pageSize`. */
  limit?: number
  pageSize?: number
  total: number
}

export type HttpMethod = 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE'

export interface ApiRequestOptions {
  method?: HttpMethod
  /** JSON-serializable body, or FormData for multipart uploads. */
  body?: unknown
  query?: Record<string, string | number | boolean | null | undefined>
  headers?: Record<string, string>
  /** Attaches `Idempotency-Key` when set. Do not set globally — only on required mutations. */
  idempotencyKey?: string
  /** When false, omits Authorization. Default true. */
  auth?: boolean
  /** Internal: skip one refresh retry after a failed authenticated call. */
  skipRefresh?: boolean
  /** Internal: skip one retry after a proxy/network failure on a GET. */
  skipTransportRetry?: boolean
  signal?: AbortSignal
}

export interface ApiRequestResult<T> {
  data: T
  meta: Record<string, unknown>
  message: string
}

/** Token pair returned by login / refresh (subset used by the client). */
export interface AuthTokenPair {
  accessToken: string
  refreshToken: string
}
