import type { ApiErrorCode } from './types'

/**
 * Typed error thrown by the API client for every failed backend response
 * and for malformed/network failures at the HTTP boundary.
 */
export class ApiError extends Error {
  readonly status: number
  readonly code: ApiErrorCode
  readonly errors: unknown[]
  readonly path: string | undefined
  readonly timestamp: string | undefined

  constructor(params: {
    message: string
    status: number
    code: ApiErrorCode
    errors?: unknown[]
    path?: string
    timestamp?: string
  }) {
    super(params.message)
    this.name = 'ApiError'
    this.status = params.status
    this.code = params.code
    this.errors = params.errors ?? []
    this.path = params.path
    this.timestamp = params.timestamp
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/** Flatten backend `errors[]` (class-validator / field messages) into one string. */
export function formatApiFieldErrors(error: ApiError): string {
  const parts: string[] = []

  for (const item of error.errors) {
    if (typeof item === 'string' && item.trim().length > 0) {
      parts.push(item.trim())
      continue
    }
    if (!isRecord(item)) continue

    if (typeof item.message === 'string' && item.message.trim().length > 0) {
      parts.push(item.message.trim())
    }

    if (isRecord(item.constraints)) {
      for (const value of Object.values(item.constraints)) {
        if (typeof value === 'string' && value.trim().length > 0) {
          parts.push(value.trim())
        }
      }
    }
  }

  return parts.join(' ')
}
