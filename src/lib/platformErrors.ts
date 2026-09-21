import { formatApiFieldErrors, isApiError } from '@/api/errors'
import type { TranslationKeys } from '@/i18n/en'

const UUID_FIELD_HINTS: Array<{ pattern: RegExp; key: keyof TranslationKeys['platform']['errors'] }> = [
  { pattern: /organizationId/i, key: 'selectOrganization' },
  { pattern: /restaurantId/i, key: 'selectRestaurant' },
  { pattern: /newOwnerUserId|targetUserId|actorId|accountUserId|userId/i, key: 'selectAccount' },
  { pattern: /subscriptionPlanId|planId/i, key: 'selectPlan' },
  { pattern: /must be a UUID/i, key: 'selectValidItem' },
]

function mapUuidMessage(
  message: string,
  errors: TranslationKeys['platform']['errors'],
): string | null {
  for (const hint of UUID_FIELD_HINTS) {
    if (hint.pattern.test(message)) {
      return errors[hint.key]
    }
  }
  return null
}

/**
 * Maps backend envelope errors to operator-facing copy.
 * Raw UUID / validation / stack details stay off the toast.
 */
export function userFacingApiError(
  error: unknown,
  t: TranslationKeys,
  fallback: string,
): string {
  const errors = t.platform.errors
  if (!isApiError(error)) {
    return fallback
  }

  const fieldText = formatApiFieldErrors(error)
  const uuidFromFields = fieldText ? mapUuidMessage(fieldText, errors) : null
  if (uuidFromFields) return uuidFromFields

  const uuidFromMessage = mapUuidMessage(error.message, errors)
  if (uuidFromMessage) return uuidFromMessage

  switch (error.code) {
    case 'AUTH_INVALID_CREDENTIALS':
      return t.login.errors.invalidCredentials
    case 'AUTH_EXPIRED_TOKEN':
    case 'AUTH_INVALID_TOKEN':
    case 'AUTH_INVALID_REFRESH_TOKEN':
    case 'UNAUTHORIZED':
      return errors.sessionExpired
    case 'AUTH_ACCOUNT_LOCKED':
      return t.login.errors.accountLocked
    case 'AUTH_ACCOUNT_SUSPENDED':
      return t.login.errors.accountSuspended
    case 'FORBIDDEN':
      return errors.forbidden
    case 'NOT_FOUND':
    case 'RESTAURANT_NOT_FOUND':
      return errors.notFound
    case 'CONFLICT':
      return errors.conflict
    case 'RATE_LIMIT_EXCEEDED':
      return t.login.errors.rateLimited
    case 'UPSTREAM_UNAVAILABLE':
      return errors.unreachable
    case 'VALIDATION_ERROR':
      return uuidFromFields || errors.validation
    default:
      if (error.status >= 500) return errors.server
      if (error.status === 429) return t.login.errors.rateLimited
      if (error.status === 404) return errors.notFound
      if (error.status === 403) return errors.forbidden
      if (error.status === 409) return errors.conflict
      if (error.status === 422 || error.status === 400) return errors.validation
      return fallback
  }
}
