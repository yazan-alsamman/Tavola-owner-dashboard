const LETTERS = 'abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ'
const NUMBERS = '23456789'
const SPECIAL = '!@#$%&*?'
const ALL = `${LETTERS}${NUMBERS}${SPECIAL}`

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
 * Cryptographically random password that satisfies typical platform rules:
 * length ≥ 12, letter, number, special character.
 * Never log or persist the result outside component state.
 */
export function generateSecurePassword(length = 16): string {
  const size = Math.max(length, 12)
  const bytes = new Uint8Array(size)
  crypto.getRandomValues(bytes)
  const required = [
    randomFrom(LETTERS, 1, bytes, 0),
    randomFrom(NUMBERS, 1, bytes, 1),
    randomFrom(SPECIAL, 1, bytes, 2),
  ]
  const rest = randomFrom(ALL, size - required.length, bytes, 3)
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
