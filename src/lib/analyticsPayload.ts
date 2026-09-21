import type { AnalyticsPayload } from '@/api/analytics'

export function pickNumber(payload: AnalyticsPayload, keys: string[]): number | null {
  for (const key of keys) {
    const value = payload[key]
    if (typeof value === 'number' && Number.isFinite(value)) return value
    if (typeof value === 'string' && value.trim() !== '') {
      const parsed = Number(value)
      if (Number.isFinite(parsed)) return parsed
    }
  }
  return null
}

export function pickString(payload: AnalyticsPayload, keys: string[]): string | null {
  for (const key of keys) {
    const value = payload[key]
    if (typeof value === 'string' && value.length > 0) return value
  }
  return null
}

export function pickArray(payload: AnalyticsPayload, keys: string[]): unknown[] {
  for (const key of keys) {
    const value = payload[key]
    if (Array.isArray(value)) return value
  }
  return []
}

export function pickRecord(payload: AnalyticsPayload, keys: string[]): Record<string, unknown> {
  for (const key of keys) {
    const value = payload[key]
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      return value as Record<string, unknown>
    }
  }
  return {}
}

export interface ChartPoint {
  label: string
  value: number
}

const LABEL_KEYS = [
  'label',
  'date',
  'day',
  'serviceDay',
  'hour',
  'hourLabel',
  'bucket',
  'month',
  'name',
]

const VALUE_KEYS = ['count', 'total', 'value', 'reservations', 'rate', 'amount']

export function recordToChartPoint(
  record: Record<string, unknown>,
  fallbackLabel: string,
): ChartPoint {
  let label = fallbackLabel
  for (const key of LABEL_KEYS) {
    if (record[key] != null) {
      label = String(record[key])
      break
    }
  }

  let value = 0
  for (const key of VALUE_KEYS) {
    const n = pickNumber(record, [key])
    if (n !== null) {
      value = n
      break
    }
  }

  return { label, value }
}

export function arrayToChartPoints(items: unknown[]): ChartPoint[] {
  return items.map((item, index) => {
    if (typeof item === 'number' && Number.isFinite(item)) {
      return { label: String(index), value: item }
    }
    if (item && typeof item === 'object' && !Array.isArray(item)) {
      return recordToChartPoint(item as Record<string, unknown>, String(index))
    }
    return { label: String(index), value: 0 }
  })
}

/** Peak-hours payloads are a fixed 24-length number array. */
export function extractPeakHoursSeries(payload: AnalyticsPayload): ChartPoint[] {
  const hours = pickArray(payload, ['peakHours', 'hours', 'buckets', 'data', 'points'])
  if (hours.length > 0) return arrayToChartPoints(hours)
  return []
}

export function extractTrendSeries(payload: AnalyticsPayload): {
  serviceDay: ChartPoint[]
  bookingCreated: ChartPoint[]
} {
  const serviceDay = pickArray(payload, [
    'serviceDayTrend',
    'serviceDayTrends',
    'byServiceDay',
  ])
  const bookingCreated = pickArray(payload, [
    'bookingCreatedTrend',
    'bookingCreatedTrends',
    'byCreatedAt',
    'createdTrend',
  ])

  const combined = pickArray(payload, ['trends', 'series', 'data', 'points'])
  if (serviceDay.length === 0 && bookingCreated.length === 0 && combined.length > 0) {
    const sd: ChartPoint[] = []
    const bc: ChartPoint[] = []
    for (const item of combined) {
      if (!item || typeof item !== 'object') continue
      const rec = item as Record<string, unknown>
      const type = pickString(rec, ['type', 'series', 'name']) ?? ''
      const point = recordToChartPoint(rec, '')
      if (
        type.toLowerCase().includes('created') ||
        type.toLowerCase().includes('booking')
      ) {
        bc.push(point)
      } else {
        sd.push(point)
      }
    }
    return { serviceDay: sd, bookingCreated: bc }
  }

  return {
    serviceDay: arrayToChartPoints(serviceDay),
    bookingCreated: arrayToChartPoints(bookingCreated),
  }
}

export function extractStatusBreakdown(payload: AnalyticsPayload): ChartPoint[] {
  const counts = pickRecord(payload, [
    'statusCounts',
    'byStatus',
    'statusBreakdown',
    'counts',
  ])
  if (Object.keys(counts).length > 0) {
    return Object.entries(counts).map(([label, value]) => ({
      label,
      value:
        typeof value === 'number'
          ? value
          : typeof value === 'string'
            ? Number(value) || 0
            : 0,
    }))
  }
  return arrayToChartPoints(pickArray(payload, ['statusCounts', 'byStatus']))
}

export function formatRate(value: number | null): string {
  if (value === null) return '—'
  if (value > 0 && value <= 1) return `${(value * 100).toFixed(1)}%`
  if (value === 0) return '0%'
  return `${value}%`
}

export function formatCount(value: number | null): string {
  if (value === null) return '—'
  return new Intl.NumberFormat().format(value)
}

function sumStatusCounts(payload: AnalyticsPayload): number | null {
  const counts = pickRecord(payload, [
    'statusCounts',
    'byStatus',
    'statusBreakdown',
    'counts',
  ])
  const values = Object.values(counts)
  if (values.length === 0) return null
  let total = 0
  let sawNumber = false
  for (const value of values) {
    if (typeof value === 'number' && Number.isFinite(value)) {
      total += value
      sawNumber = true
    } else if (typeof value === 'string' && value.trim() !== '') {
      const parsed = Number(value)
      if (Number.isFinite(parsed)) {
        total += parsed
        sawNumber = true
      }
    }
  }
  return sawNumber ? total : null
}

export function extractReservationSummaryStats(payload: AnalyticsPayload) {
  const fromCounts = sumStatusCounts(payload)
  const hasPayload = Object.keys(payload).length > 0
  const noShowRate = pickNumber(payload, [
    'noShowRate',
    'noShowPercentage',
    'noShowPercent',
  ])
  const cancellationRate = pickNumber(payload, [
    'cancellationRate',
    'cancelledRate',
    'cancellationPercentage',
  ])
  const completionRate = pickNumber(payload, [
    'completionRate',
    'completedRate',
  ])

  return {
    total:
      pickNumber(payload, [
        'totalReservations',
        'totalCount',
        'total',
        'count',
        'reservationCount',
      ]) ?? fromCounts,
    // Live API returns null rates when the denominator is empty — show 0 once we have a payload.
    noShowRate: noShowRate ?? (hasPayload ? 0 : null),
    averagePartySize: pickNumber(payload, [
      'averagePartySize',
      'avgPartySize',
      'averageGuests',
    ]),
    cancellationRate: cancellationRate ?? (hasPayload ? 0 : null),
    completionRate: completionRate ?? (hasPayload ? 0 : null),
  }
}

export function extractCustomerStats(payload: AnalyticsPayload) {
  return {
    newCustomers: pickNumber(payload, [
      'uniqueRegisteredCustomers',
      'newCustomers',
      'uniqueCustomers',
      'newCustomerCount',
      'firstTimeCustomers',
    ]),
    returning: pickNumber(payload, [
      'returningRegisteredCustomers',
      'returningCustomers',
      'returningCustomerCount',
      'repeatCustomers',
    ]),
    averagePartySize: pickNumber(payload, [
      'averagePartySize',
      'avgPartySize',
    ]),
  }
}

export function extractReviewStats(payload: AnalyticsPayload) {
  return {
    count: pickNumber(payload, [
      'activeReviewCount',
      'reviewCount',
      'totalReviews',
      'count',
    ]),
    averageRating: pickNumber(payload, [
      'averageRating',
      'avgRating',
      'rating',
    ]),
  }
}

export function extractWaitlistStats(payload: AnalyticsPayload) {
  const entriesRecord = pickRecord(payload, [
    'waitlistEntries',
    'entriesByStatus',
    'entries',
  ])
  const entrySum = Object.values(entriesRecord).reduce<number>((acc, value) => {
    if (typeof value === 'number' && Number.isFinite(value)) return acc + value
    if (typeof value === 'string') {
      const parsed = Number(value)
      return Number.isFinite(parsed) ? acc + parsed : acc
    }
    return acc
  }, 0)

  return {
    entries:
      pickNumber(payload, [
        'entryCount',
        'totalEntries',
        'entries',
        'count',
      ]) ?? (Object.keys(entriesRecord).length > 0 ? entrySum : null),
    conversions: pickNumber(payload, [
      'conversionCount',
      'conversions',
      'converted',
    ]),
    conversionRate: pickNumber(payload, [
      'waitlistConversionRate',
      'conversionRate',
      'conversionPercentage',
    ]),
  }
}

/** `totalRestaurants` → `Total restaurants`. Backend keys are not UI copy. */
export function humanizePayloadKey(key: string): string {
  const spaced = key
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .trim()
    .toLowerCase()
  return spaced.charAt(0).toUpperCase() + spaced.slice(1)
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}(T[\d:.]+)?/

/** Formats primitives for display: grouped numbers, readable dates, yes/no. */
export function formatPayloadValue(value: unknown, key = ''): string {
  if (typeof value === 'boolean') return value ? 'Yes' : 'No'
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) return '—'
    if (/rate|percent|percentage/i.test(key)) return formatRate(value)
    return new Intl.NumberFormat().format(value)
  }
  if (typeof value === 'string') {
    if (ISO_DATE.test(value)) {
      const parsed = new Date(value)
      if (!Number.isNaN(parsed.getTime())) return parsed.toLocaleString()
    }
    return value
  }
  return String(value)
}

export function displayPayloadFields(
  payload: Record<string, unknown>,
): Array<{ key: string; label: string; value: string }> {
  return Object.entries(payload)
    .filter(([, value]) => value !== null && value !== undefined && typeof value !== 'object')
    .map(([key, value]) => ({
      key,
      label: humanizePayloadKey(key),
      value: formatPayloadValue(value, key),
    }))
}
