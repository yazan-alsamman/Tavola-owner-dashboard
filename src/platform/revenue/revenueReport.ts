/** One report bucket. Matches Postman `buckets[]` after normalization. */
export interface RevenueBucketAmounts {
  key: string
  currency: string
  recordedCount: number
  recordedTotal: number
  reversedCount: number
  reversedTotal: number
}

/** Amounts for one currency. Currencies are never added together. */
export interface CurrencyFeeTotals {
  currency: string
  recordedCount: number
  recordedTotal: number
  reversedCount: number
  reversedTotal: number
  /** recordedTotal − reversedTotal. Fees still recorded, not a settlement balance. */
  netRecorded: number
}

export interface NamedEntity {
  id: string
  name?: string
  slug?: string
}

export interface EntityFeeGroup {
  id: string
  /** Restaurant or organization name, or the id when the name was not found. */
  title: string
  slug: string | null
  nameFound: boolean
  currencies: CurrencyFeeTotals[]
}

export interface NameLookupPage {
  items: NamedEntity[]
  total: number
}

export function netRecordedFee(recordedTotal: number, reversedTotal: number): number {
  return recordedTotal - reversedTotal
}

export function formatFeeAmount(value: number): string {
  return value.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

function compareCurrency(a: string, b: string): number {
  if (a === b) return 0
  if (a === '') return 1
  if (b === '') return -1
  return a.localeCompare(b)
}

/** Sums buckets that share a currency. A second currency stays its own total. */
export function summarizeByCurrency(buckets: readonly RevenueBucketAmounts[]): CurrencyFeeTotals[] {
  const totals = new Map<string, CurrencyFeeTotals>()
  for (const bucket of buckets) {
    const currency = bucket.currency.trim()
    const current = totals.get(currency) ?? {
      currency,
      recordedCount: 0,
      recordedTotal: 0,
      reversedCount: 0,
      reversedTotal: 0,
      netRecorded: 0,
    }
    current.recordedCount += bucket.recordedCount
    current.recordedTotal += bucket.recordedTotal
    current.reversedCount += bucket.reversedCount
    current.reversedTotal += bucket.reversedTotal
    current.netRecorded = netRecordedFee(current.recordedTotal, current.reversedTotal)
    totals.set(currency, current)
  }
  return [...totals.values()].sort((a, b) => compareCurrency(a.currency, b.currency))
}

export function entityHeading(
  id: string,
  match: Pick<NamedEntity, 'name' | 'slug'> | undefined,
): { title: string; slug: string | null; nameFound: boolean } {
  const name = match?.name?.trim() ?? ''
  const slug = match?.slug?.trim() ?? ''
  if (name) {
    return { title: name, slug: slug || null, nameFound: true }
  }
  return { title: id, slug: slug || null, nameFound: false }
}

/**
 * One block per bucket key, with a row per currency inside it.
 * Sorted by resolved name. A key with only reversed fees is kept.
 */
export function groupBucketsByEntity(
  buckets: readonly RevenueBucketAmounts[],
  lookup: ReadonlyMap<string, NamedEntity>,
  locale?: string,
): EntityFeeGroup[] {
  const byKey = new Map<string, RevenueBucketAmounts[]>()
  for (const bucket of buckets) {
    const rows = byKey.get(bucket.key) ?? []
    rows.push(bucket)
    byKey.set(bucket.key, rows)
  }

  const groups = [...byKey.entries()].map(([id, rows]) => {
    const heading = entityHeading(id, lookup.get(id))
    return {
      id,
      title: heading.title,
      slug: heading.slug,
      nameFound: heading.nameFound,
      currencies: summarizeByCurrency(rows),
    }
  })

  groups.sort((a, b) => {
    const byTitle = a.title.localeCompare(b.title, locale, { sensitivity: 'base' })
    if (byTitle !== 0) return byTitle
    return a.id.localeCompare(b.id)
  })
  return groups
}

function isAbortError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'name' in error &&
    (error as { name?: string }).name === 'AbortError'
  )
}

/**
 * Pages a name lookup until every key is found or the list is exhausted.
 * A failed page returns the names already resolved and does not throw.
 */
export async function resolveEntityNames(
  keys: readonly string[],
  fetchPage: (page: number, limit: number) => Promise<NameLookupPage>,
  limit = 100,
): Promise<Map<string, NamedEntity>> {
  const pending = new Set(keys.filter((key) => key.length > 0))
  const found = new Map<string, NamedEntity>()
  if (pending.size === 0) return found

  let page = 1
  let seen = 0
  while (pending.size > 0 && page <= 500) {
    let result: NameLookupPage
    try {
      result = await fetchPage(page, limit)
    } catch (error) {
      if (isAbortError(error)) throw error
      return found
    }

    const items = result.items ?? []
    for (const item of items) {
      if (!item?.id || !pending.has(item.id)) continue
      found.set(item.id, item)
      pending.delete(item.id)
    }

    seen += items.length
    if (pending.size === 0) break
    if (items.length === 0 || items.length < limit) break
    if (typeof result.total === 'number' && seen >= result.total) break
    page += 1
  }

  return found
}
