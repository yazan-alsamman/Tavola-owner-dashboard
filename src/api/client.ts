import { ApiError } from './errors'
import { tokenStore } from './tokenStore'
import type {
  ApiErrorCode,
  ApiRequestOptions,
  ApiRequestResult,
  HttpMethod,
} from './types'

/**
 * Platform Owner HTTP client.
 *
 * The platform issuer is isolated from restaurant staff auth. On 401 with a
 * stored refresh token, one `POST /platform-admin/refresh` attempt is made
 * before clearing the session. Restaurant `POST /auth/refresh` must never be
 * called with a platform token.
 */

function shouldInvalidateSession(error: ApiError, options: ApiRequestOptions): boolean {
  if (options.auth === false) return false
  if (!tokenStore.getAccessToken()) return false
  return error.status === 401
}

let refreshInFlight: Promise<boolean> | null = null

async function tryRefreshPlatformSession(): Promise<boolean> {
  const refreshToken = tokenStore.getRefreshToken()
  if (!refreshToken) return false

  if (!refreshInFlight) {
    refreshInFlight = (async () => {
      try {
        const response = await executeFetch('/platform-admin/refresh', {
          method: 'POST',
          auth: false,
          body: { refreshToken },
        })
        const result = await parseEnvelopeResponse<{
          accessToken?: string
          refreshToken?: string
        }>(response)
        const accessToken = result.data?.accessToken
        if (typeof accessToken !== 'string' || accessToken.length === 0) {
          return false
        }
        tokenStore.setTokens({
          accessToken,
          refreshToken:
            typeof result.data?.refreshToken === 'string'
              ? result.data.refreshToken
              : refreshToken,
        })
        return true
      } catch {
        return false
      } finally {
        refreshInFlight = null
      }
    })()
  }

  return refreshInFlight
}

/**
 * Resolves and validates `VITE_API_BASE_URL`.
 * Accepts absolute `http(s)` URLs, or a path-absolute root (e.g. `/api/v1`)
 * for same-origin Vite proxying during local development.
 */
export function getApiBaseUrl(): string {
  const raw = import.meta.env.VITE_API_BASE_URL

  if (typeof raw !== 'string' || raw.trim() === '') {
    throw new Error(
      'VITE_API_BASE_URL is not configured. Set it in .env.local (see .env.example).',
    )
  }

  const baseUrl = raw.trim().replace(/\/+$/, '')

  if (/^https?:\/\//i.test(baseUrl) || baseUrl.startsWith('/')) {
    return baseUrl
  }

  throw new Error(
    `VITE_API_BASE_URL must be an absolute http(s) URL or a path starting with "/". Received: "${raw}"`,
  )
}

/** Client-generated UUID for `Idempotency-Key` on required mutations. */
export function createIdempotencyKey(): string {
  return crypto.randomUUID()
}

function resolveAbsoluteBaseUrl(baseUrl: string): string {
  if (/^https?:\/\//i.test(baseUrl)) {
    return baseUrl
  }

  const origin =
    typeof window !== 'undefined' && window.location?.origin
      ? window.location.origin
      : 'http://127.0.0.1'

  return `${origin}${baseUrl}`
}

function buildUrl(
  path: string,
  query: ApiRequestOptions['query'],
): string {
  const baseUrl = resolveAbsoluteBaseUrl(getApiBaseUrl())
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  const url = new URL(`${baseUrl}${normalizedPath}`)

  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value === undefined || value === null) continue
      url.searchParams.set(key, String(value))
    }
  }

  return url.toString()
}

function isFormData(body: unknown): body is FormData {
  return typeof FormData !== 'undefined' && body instanceof FormData
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function readErrorCode(value: unknown): ApiErrorCode {
  return typeof value === 'string' && value.length > 0 ? value : 'UNKNOWN_ERROR'
}

function toApiErrorFromEnvelope(
  status: number,
  body: Record<string, unknown>,
): ApiError {
  const message =
    typeof body.message === 'string' && body.message.length > 0
      ? body.message
      : 'Request failed.'

  return new ApiError({
    message,
    status,
    code: readErrorCode(body.code),
    errors: Array.isArray(body.errors) ? body.errors : [],
    path: typeof body.path === 'string' ? body.path : undefined,
    timestamp: typeof body.timestamp === 'string' ? body.timestamp : undefined,
  })
}

function toNetworkApiError(status: number, fallbackMessage: string): ApiError {
  return new ApiError({
    message: fallbackMessage,
    status,
    code: 'UNKNOWN_ERROR',
  })
}

/** Proxy/DNS/timeout — the platform API envelope never arrived. */
function toUpstreamUnavailable(status: number): ApiError {
  return new ApiError({
    message: 'Could not reach the platform API.',
    status,
    code: 'UPSTREAM_UNAVAILABLE',
  })
}

function isTransportFailure(error: unknown): boolean {
  return error instanceof ApiError && error.code === 'UPSTREAM_UNAVAILABLE'
}

async function parseJsonBody(response: Response): Promise<unknown> {
  const text = await response.text()
  if (text.trim() === '') {
    return undefined
  }

  try {
    return JSON.parse(text) as unknown
  } catch {
    throw new ApiError({
      message: 'Received a malformed JSON response from the API.',
      status: response.status,
      code: 'UNKNOWN_ERROR',
    })
  }
}

async function executeFetch(
  path: string,
  options: ApiRequestOptions,
): Promise<Response> {
  const method: HttpMethod = options.method ?? 'GET'
  const headers = new Headers(options.headers)

  const useAuth = options.auth !== false
  if (useAuth) {
    const token = tokenStore.getAccessToken()
    if (token) {
      headers.set('Authorization', `Bearer ${token}`)
    }
  }

  if (options.idempotencyKey) {
    headers.set('Idempotency-Key', options.idempotencyKey)
  }

  let body: BodyInit | undefined
  if (options.body !== undefined && options.body !== null) {
    if (isFormData(options.body)) {
      body = options.body
      headers.delete('Content-Type')
    } else {
      if (!headers.has('Content-Type')) {
        headers.set('Content-Type', 'application/json')
      }
      body = JSON.stringify(options.body)
    }
  }

  return fetch(buildUrl(path, options.query), {
    method,
    headers,
    body,
    signal: options.signal,
  })
}

async function parseEnvelopeResponse<T>(
  response: Response,
): Promise<ApiRequestResult<T>> {
  if (response.status === 204) {
    return {
      data: undefined as T,
      meta: {},
      message: '',
    }
  }

  const parsed: unknown = await parseJsonBody(response)

  if (response.status === 202) {
    if (!isRecord(parsed)) {
      return { data: undefined as T, meta: {}, message: '' }
    }
    if (parsed.success === false) {
      throw toApiErrorFromEnvelope(response.status, parsed)
    }
    return {
      data: (parsed.data as T) ?? (parsed as T),
      meta: isRecord(parsed.meta) ? parsed.meta : {},
      message: typeof parsed.message === 'string' ? parsed.message : '',
    }
  }

  if (!isRecord(parsed)) {
    if (!response.ok) {
      if (response.status >= 500) {
        throw toUpstreamUnavailable(response.status)
      }
      throw toNetworkApiError(
        response.status,
        `Request failed with status ${response.status}.`,
      )
    }
    throw new ApiError({
      message: 'Unexpected API response shape.',
      status: response.status,
      code: 'UNKNOWN_ERROR',
    })
  }

  if (parsed.success === false || !response.ok) {
    throw toApiErrorFromEnvelope(response.status, parsed)
  }

  if (parsed.success !== true) {
    throw new ApiError({
      message: 'Unexpected API response shape.',
      status: response.status,
      code: 'UNKNOWN_ERROR',
    })
  }

  return {
    data: parsed.data as T,
    meta: isRecord(parsed.meta) ? parsed.meta : {},
    message: typeof parsed.message === 'string' ? parsed.message : '',
  }
}

async function requestWithResult<T>(
  path: string,
  options: ApiRequestOptions = {},
): Promise<ApiRequestResult<T>> {
  try {
    const response = await executeFetch(path, options)
    return await parseEnvelopeResponse<T>(response)
  } catch (error) {
    const failure =
      error instanceof ApiError
        ? error
        : error instanceof TypeError
          ? toUpstreamUnavailable(0)
          : error

    if (
      isTransportFailure(failure) &&
      !options.skipTransportRetry &&
      (options.method ?? 'GET') === 'GET' &&
      !options.signal?.aborted
    ) {
      await new Promise((resolve) => setTimeout(resolve, 700))
      if (options.signal?.aborted) throw failure
      return requestWithResult<T>(path, { ...options, skipTransportRetry: true })
    }

    if (
      error instanceof ApiError &&
      error.status === 401 &&
      options.auth !== false &&
      !options.skipRefresh &&
      path !== '/platform-admin/refresh' &&
      path !== '/platform-admin/logout' &&
      path !== '/platform-admin/login'
    ) {
      const refreshed = await tryRefreshPlatformSession()
      if (refreshed) {
        return requestWithResult<T>(path, { ...options, skipRefresh: true })
      }
    }

    if (failure instanceof ApiError && shouldInvalidateSession(failure, options)) {
      tokenStore.clear()
      tokenStore.notifySessionInvalidated()
    }
    throw failure
  }
}

/**
 * Typed HTTP request against the Tavla API.
 * Returns unwrapped `data` from the success envelope.
 * Throws `ApiError` on failure.
 */
export async function apiRequest<T>(
  path: string,
  options?: ApiRequestOptions,
): Promise<T> {
  const result = await requestWithResult<T>(path, options)
  return result.data
}

/**
 * Same as `apiRequest`, but also returns envelope `message` and `meta`
 * for callers that need them (rare — pagination lives in `data`).
 */
export async function apiRequestWithMeta<T>(
  path: string,
  options?: ApiRequestOptions,
): Promise<ApiRequestResult<T>> {
  return requestWithResult<T>(path, options)
}
