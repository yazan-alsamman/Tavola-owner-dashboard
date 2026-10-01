const LOWER = 'abcdefghijkmnopqrstuvwxyz'
const UPPER = 'ABCDEFGHJKLMNPQRSTUVWXYZ'
const NUMBERS = '23456789'
const SPECIAL = '!@#$%&*?'
const ALL = `${LOWER}${UPPER}${NUMBERS}${SPECIAL}`

/** Owner passwords set while creating an organization. */
export const ORGANIZATION_PASSWORD_MIN = 8

export type PasswordIssue = 'length' | 'uppercase' | 'lowercase' | 'number' | 'special'

/** Missing rules for an organization owner password. Empty password reports every rule. */
export function passwordIssues(
  password: string,
  minLength = ORGANIZATION_PASSWORD_MIN,
): PasswordIssue[] {
  const issues: PasswordIssue[] = []
  if (password.length < minLength) issues.push('length')
  if (!/[A-Z]/.test(password)) issues.push('uppercase')
  if (!/[a-z]/.test(password)) issues.push('lowercase')
  if (!/[0-9]/.test(password)) issues.push('number')
  if (!/[^A-Za-z0-9]/.test(password)) issues.push('special')
  return issues
}

export function passwordRequirementMessage(
  password: string,
  copy: Record<PasswordIssue, string>,
): string | null {
  if (!password) return null
  const issues = passwordIssues(password)
  if (issues.length === 0) return null
  return issues.map((issue) => copy[issue]).join(' ')
}

function randomFrom(alphabet: string, count: number, bytes: Uint8Array, offset: number): string {
  let out = ''
  for (let i = 0; i < count; i += 1) {
    out += alphabet[bytes[offset + i]! % alphabet.length]
  }
  return out
}

/** URL-safe restaurant slug from a display name. Not a login username. */
export function slugFromName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48)
}

/**
 * Cryptographically random password that satisfies organization owner rules:
 * length ≥ 12, uppercase, lowercase, number, and special character.
 * Never log or persist the result outside component state.
 */
export function generateSecurePassword(length = 16): string {
  const size = Math.max(length, 12)
  const bytes = new Uint8Array(size)
  crypto.getRandomValues(bytes)
  const required = [
    randomFrom(LOWER, 1, bytes, 0),
    randomFrom(UPPER, 1, bytes, 1),
    randomFrom(NUMBERS, 1, bytes, 2),
    randomFrom(SPECIAL, 1, bytes, 3),
  ]
  const rest = randomFrom(ALL, size - required.length, bytes, 4)
  const chars = [...required, ...rest.split('')]
  for (let i = chars.length - 1; i > 0; i -= 1) {
    const j = bytes[i]! % (i + 1)
    const tmp = chars[i]!
    chars[i] = chars[j]!
    chars[j] = tmp
  }
  return chars.join('')
}

export async function copyText(value: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(value)
    return true
  } catch {
    return false
  }
}
