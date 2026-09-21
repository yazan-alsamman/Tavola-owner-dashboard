export const MAX_PLATFORM_RANGE_DAYS = 366

export function isoDaysAgo(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() - days)
  return d.toISOString().slice(0, 10)
}

export function todayIso(): string {
  return new Date().toISOString().slice(0, 10)
}

/** Inclusive calendar-day span. Invalid dates return NaN. */
export function inclusiveDayCount(from: string, to: string): number {
  const start = Date.parse(`${from}T00:00:00.000Z`)
  const end = Date.parse(`${to}T00:00:00.000Z`)
  if (Number.isNaN(start) || Number.isNaN(end) || end < start) return NaN
  return Math.floor((end - start) / 86_400_000) + 1
}

export function isWithinMaxPlatformRange(from: string, to: string): boolean {
  const days = inclusiveDayCount(from, to)
  return Number.isFinite(days) && days >= 1 && days <= MAX_PLATFORM_RANGE_DAYS
}

export function formatPlatformDateTime(value: string | undefined, locale: string): string {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString(locale === 'ar' ? 'ar' : 'en', {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}
