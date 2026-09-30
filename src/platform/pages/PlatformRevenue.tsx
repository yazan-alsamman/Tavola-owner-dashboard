import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  exportPlatformRevenue,
  getPlatformRevenueReport,
  searchPlatformOrganizations,
  searchPlatformRestaurants,
  type PlatformOrganizationLookupDto,
  type PlatformRestaurantLookupDto,
  type RevenueExportDto,
  type RevenueGroupBy,
  type RevenueReportDto,
} from '@/platform/api/platformAdmin'
import { userFacingApiError } from '@/lib/platformErrors'
import { Select } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Card, CardTitle } from '@/components/ui/Card'
import { StatCard } from '@/components/ui/StatCard'
import { EmptyState } from '@/components/ui/EmptyState'
import {
  DataTable,
  DataTableHead,
  DataTableHeader,
  DataTableBody,
  DataTableRow,
  DataTableCell,
} from '@/components/ui/DataTable'
import { Num } from '@/components/ui/Num'
import { useLocale } from '@/context/LocaleContext'
import { useToast } from '@/context/ToastContext'
import { usePlatformAccess } from '@/platform/auth/usePlatformAccess'
import { OrganizationPicker, RestaurantPicker } from '@/platform/ui/EntitySearchPicker'
import { DateRangeFilter } from '@/platform/ui/DateRangeFilter'
import { formatPlatformDateTime, isoDaysAgo, isWithinMaxPlatformRange, todayIso } from '@/platform/ui/dates'
import { PlatformListPage } from '@/platform/ui/PlatformListPage'
import {
  formatFeeAmount,
  groupBucketsByEntity,
  netRecordedFee,
  resolveEntityNames,
  summarizeByCurrency,
  type NamedEntity,
} from '@/platform/revenue/revenueReport'

const GROUP_BY_OPTIONS: RevenueGroupBy[] = [
  'restaurant',
  'organization',
  'day',
  'week',
  'month',
  'quarter',
  'year',
  'source',
]

const ENTITY_GROUP = new Set<RevenueGroupBy>(['restaurant', 'organization'])
const NAME_PAGE_SIZE = 100

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError'
}

function currencyCode(currency: string, unknownLabel: string): string {
  return currency.trim() || unknownLabel
}

function feeText(amount: number, currency: string, unknownLabel: string): string {
  return `${formatFeeAmount(amount)} ${currencyCode(currency, unknownLabel)}`
}

export function PlatformRevenuePage() {
  const { t, locale } = useLocale()
  const { toast } = useToast()
  const { canQuery } = usePlatformAccess()
  const p = t.platform.revenue

  const [from, setFrom] = useState(() => isoDaysAgo(30))
  const [to, setTo] = useState(() => todayIso())
  const [groupBy, setGroupBy] = useState<RevenueGroupBy>('restaurant')
  const [restaurant, setRestaurant] = useState<PlatformRestaurantLookupDto | null>(null)
  const [organization, setOrganization] = useState<PlatformOrganizationLookupDto | null>(null)
  const [names, setNames] = useState<Map<string, NamedEntity>>(() => new Map())
  const [applied, setApplied] = useState(() => ({
    from: isoDaysAgo(30),
    to: todayIso(),
    groupBy: 'restaurant' as RevenueGroupBy,
    restaurantId: undefined as string | undefined,
    organizationId: undefined as string | undefined,
  }))
  const [report, setReport] = useState<RevenueReportDto | null>(null)
  const [ledger, setLedger] = useState<RevenueExportDto | null>(null)
  const [ledgerError, setLedgerError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const groupLabel: Record<RevenueGroupBy, string> = {
    day: p.groupDay,
    week: p.groupWeek,
    month: p.groupMonth,
    quarter: p.groupQuarter,
    year: p.groupYear,
    restaurant: p.groupRestaurant,
    organization: p.groupOrganization,
    source: p.groupSource,
  }

  const load = useCallback(
    async (signal?: AbortSignal) => {
      if (!canQuery) {
        setReport(null)
        setNames(new Map())
        setLedger(null)
        setLedgerError(null)
        setLoading(false)
        setError(null)
        return
      }
      setLoading(true)
      setError(null)
      setReport(null)
      setNames(new Map())
      setLedger(null)
      setLedgerError(null)
      try {
        const result = await getPlatformRevenueReport(applied, signal)
        if (signal?.aborted) return
        setReport(result)

        if (ENTITY_GROUP.has(applied.groupBy)) {
          try {
            const resolved = await resolveEntityNames(
              result.buckets.map((bucket) => bucket.key),
              async (page, limit) => {
                const lookup =
                  applied.groupBy === 'restaurant'
                    ? await searchPlatformRestaurants({ page, pageSize: limit }, signal)
                    : await searchPlatformOrganizations({ page, pageSize: limit }, signal)
                return {
                  items: lookup.items ?? [],
                  total: typeof lookup.total === 'number' ? lookup.total : Number.POSITIVE_INFINITY,
                }
              },
              NAME_PAGE_SIZE,
            )
            if (!signal?.aborted) setNames(resolved)
          } catch (err) {
            if (signal?.aborted || isAbortError(err)) return
            if (!signal?.aborted) setNames(new Map())
          }
        } else if (!signal?.aborted) {
          setNames(new Map())
        }

        if (signal?.aborted) return

        if (applied.restaurantId) {
          try {
            const exported = await exportPlatformRevenue(
              {
                from: applied.from,
                to: applied.to,
                restaurantId: applied.restaurantId,
                organizationId: applied.organizationId,
              },
              signal,
            )
            if (!signal?.aborted) setLedger(exported)
          } catch (err) {
            if (signal?.aborted || isAbortError(err)) return
            setLedger(null)
            setLedgerError(userFacingApiError(err, t, p.ledgerError))
          }
        }
      } catch (err) {
        if (signal?.aborted || isAbortError(err)) return
        setError(userFacingApiError(err, t, p.errorLoad))
        setReport(null)
        setNames(new Map())
      } finally {
        if (!signal?.aborted) setLoading(false)
      }
    },
    [applied, canQuery, p.errorLoad, p.ledgerError, t],
  )

  useEffect(() => {
    const ac = new AbortController()
    void load(ac.signal)
    return () => ac.abort()
  }, [load])

  const buckets = useMemo(() => report?.buckets ?? [], [report])
  const entityView = ENTITY_GROUP.has(applied.groupBy)
  const summaries = useMemo(() => summarizeByCurrency(buckets), [buckets])
  const groups = useMemo(
    () => (entityView ? groupBucketsByEntity(buckets, names, locale) : []),
    [buckets, entityView, locale, names],
  )

  const statusLabel = (status: string): string => {
    if (status === 'Recorded') return p.statusRecorded
    if (status === 'Reversed') return p.statusReversed
    return status || '—'
  }

  const handleExport = async (): Promise<void> => {
    setExporting(true)
    try {
      const data = await exportPlatformRevenue({
        from: applied.from,
        to: applied.to,
        restaurantId: applied.restaurantId,
        organizationId: applied.organizationId,
      })
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      const restaurantSuffix = applied.restaurantId ? `-${applied.restaurantId}` : ''
      link.download = `tavola-revenue-${applied.from}-${applied.to}${restaurantSuffix}.json`
      link.click()
      URL.revokeObjectURL(url)
      toast('success', p.exportSuccess)
    } catch (err) {
      toast('error', userFacingApiError(err, t, p.exportError))
    } finally {
      setExporting(false)
    }
  }

  return (
    <PlatformListPage
      title={p.title}
      subtitle={p.subtitle}
      canQuery={canQuery}
      loading={loading}
      hasRows={buckets.length > 0}
      error={error}
      onRetry={() => void load()}
      emptyIcon="payments"
      emptyTitle={p.emptyTitle}
      emptyBody={p.emptyBody}
      headerActions={
        <Button variant="outline" onClick={() => void handleExport()} loading={exporting} disabled={!canQuery}>
          {p.export}
        </Button>
      }
      filters={
        <DateRangeFilter
          from={from}
          to={to}
          onFromChange={setFrom}
          onToChange={setTo}
          fromLabel={p.from}
          toLabel={p.to}
          extra={
            <>
              <Select
                label={p.groupBy}
                value={groupBy}
                onChange={(e) => setGroupBy(e.target.value as RevenueGroupBy)}
                className="min-w-[160px]"
              >
                {GROUP_BY_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {groupLabel[opt]}
                  </option>
                ))}
              </Select>
              <RestaurantPicker
                selected={restaurant}
                onSelect={setRestaurant}
                label={p.restaurant}
              />
              <OrganizationPicker
                selected={organization}
                onSelect={setOrganization}
                label={p.organization}
              />
            </>
          }
          actions={
            <Button
              variant="secondary"
              onClick={() => {
                if (!isWithinMaxPlatformRange(from, to)) {
                  toast('error', t.platform.common.rangeTooLong)
                  return
                }
                setApplied({
                  from,
                  to,
                  groupBy,
                  restaurantId: restaurant?.id,
                  organizationId: organization?.id,
                })
              }}
              loading={loading}
            >
              {p.apply}
            </Button>
          }
        />
      }
    >
      <div className="mb-4 space-y-4">
        {summaries.map((summary) => {
          const code = currencyCode(summary.currency, p.unknownCurrency)
          return (
            <div key={summary.currency || 'unknown'} className="space-y-2">
              <p className="text-overline text-on-surface-variant">{code}</p>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <StatCard
                  title={p.summaryRecorded}
                  value={<Num>{feeText(summary.recordedTotal, summary.currency, p.unknownCurrency)}</Num>}
                  icon="payments"
                  variant="success"
                />
                <StatCard
                  title={p.summaryReversed}
                  value={<Num>{feeText(summary.reversedTotal, summary.currency, p.unknownCurrency)}</Num>}
                  icon="payments"
                  variant="warning"
                />
                <StatCard
                  title={p.summaryNet}
                  value={<Num>{feeText(summary.netRecorded, summary.currency, p.unknownCurrency)}</Num>}
                  icon="payments"
                  variant="primary"
                />
              </div>
            </div>
          )
        })}
      </div>

      {entityView ? (
        <div className="space-y-4">
          {groups.map((group) => (
            <Card key={group.id} className="space-y-3">
              <div>
                <CardTitle>{group.title}</CardTitle>
                {group.slug ? (
                  <p className="mt-1 text-body-sm text-on-surface-variant">{group.slug}</p>
                ) : null}
              </div>
              <DataTable bare>
                <DataTableHead>
                  <DataTableHeader>{p.colCurrency}</DataTableHeader>
                  <DataTableHeader numeric>{p.colRecordedCount}</DataTableHeader>
                  <DataTableHeader numeric>{p.colRecordedTotal}</DataTableHeader>
                  <DataTableHeader numeric>{p.colReversedCount}</DataTableHeader>
                  <DataTableHeader numeric>{p.colReversedTotal}</DataTableHeader>
                  <DataTableHeader numeric>{p.colNet}</DataTableHeader>
                </DataTableHead>
                <DataTableBody>
                  {group.currencies.map((row) => (
                    <DataTableRow key={`${group.id}-${row.currency || 'unknown'}`}>
                      <DataTableCell className="font-medium">
                        {currencyCode(row.currency, p.unknownCurrency)}
                      </DataTableCell>
                      <DataTableCell numeric>
                        <Num>{row.recordedCount}</Num>
                      </DataTableCell>
                      <DataTableCell numeric>
                        <Num>{feeText(row.recordedTotal, row.currency, p.unknownCurrency)}</Num>
                      </DataTableCell>
                      <DataTableCell numeric>
                        <Num>{row.reversedCount}</Num>
                      </DataTableCell>
                      <DataTableCell numeric>
                        <Num>{feeText(row.reversedTotal, row.currency, p.unknownCurrency)}</Num>
                      </DataTableCell>
                      <DataTableCell numeric>
                        <Num>{feeText(row.netRecorded, row.currency, p.unknownCurrency)}</Num>
                      </DataTableCell>
                    </DataTableRow>
                  ))}
                </DataTableBody>
              </DataTable>
            </Card>
          ))}
        </div>
      ) : (
        <DataTable>
          <DataTableHead>
            <DataTableHeader>{p.colKey}</DataTableHeader>
            <DataTableHeader>{p.colCurrency}</DataTableHeader>
            <DataTableHeader numeric>{p.colRecordedCount}</DataTableHeader>
            <DataTableHeader numeric>{p.colRecordedTotal}</DataTableHeader>
            <DataTableHeader numeric>{p.colReversedCount}</DataTableHeader>
            <DataTableHeader numeric>{p.colReversedTotal}</DataTableHeader>
            <DataTableHeader numeric>{p.colNet}</DataTableHeader>
          </DataTableHead>
          <DataTableBody>
            {buckets.map((bucket, index) => {
              const net = netRecordedFee(bucket.recordedTotal, bucket.reversedTotal)
              return (
                <DataTableRow key={`${bucket.key}-${bucket.currency || 'unknown'}-${index}`}>
                  <DataTableCell className="font-medium">{bucket.key || '—'}</DataTableCell>
                  <DataTableCell>{currencyCode(bucket.currency, p.unknownCurrency)}</DataTableCell>
                  <DataTableCell numeric>
                    <Num>{bucket.recordedCount}</Num>
                  </DataTableCell>
                  <DataTableCell numeric>
                    <Num>{feeText(bucket.recordedTotal, bucket.currency, p.unknownCurrency)}</Num>
                  </DataTableCell>
                  <DataTableCell numeric>
                    <Num>{bucket.reversedCount}</Num>
                  </DataTableCell>
                  <DataTableCell numeric>
                    <Num>{feeText(bucket.reversedTotal, bucket.currency, p.unknownCurrency)}</Num>
                  </DataTableCell>
                  <DataTableCell numeric>
                    <Num>{feeText(net, bucket.currency, p.unknownCurrency)}</Num>
                  </DataTableCell>
                </DataTableRow>
              )
            })}
          </DataTableBody>
        </DataTable>
      )}

      {applied.restaurantId && (ledger || ledgerError) ? (
        <Card className="mt-4 space-y-3">
          <div>
            <CardTitle>{p.ledgerTitle}</CardTitle>
            <p className="mt-1 text-body-sm text-on-surface-variant">{p.ledgerBody}</p>
          </div>
          {ledgerError ? (
            <EmptyState
              icon="error"
              title={p.ledgerError}
              description={ledgerError}
              action={
                <Button variant="secondary" onClick={() => void load()}>
                  {t.common.retry}
                </Button>
              }
            />
          ) : ledger && ledger.rows.length === 0 ? (
            <EmptyState icon="payments" title={p.ledgerEmptyTitle} description={p.ledgerEmptyBody} />
          ) : ledger ? (
            <DataTable bare>
              <DataTableHead>
                <DataTableHeader>{p.colStatus}</DataTableHeader>
                <DataTableHeader numeric>{p.colFee}</DataTableHeader>
                <DataTableHeader>{p.colRecordedAt}</DataTableHeader>
                <DataTableHeader>{p.colReversedAt}</DataTableHeader>
                <DataTableHeader>{p.colCreatedVia}</DataTableHeader>
              </DataTableHead>
              <DataTableBody>
                {ledger.rows.map((row) => (
                  <DataTableRow key={row.id || `${row.recordedAt}-${row.feeAmount}`}>
                    <DataTableCell>
                      <div className="font-medium">{statusLabel(row.status)}</div>
                      {row.customerIdentityKey ? (
                        <div dir="ltr" className="mt-0.5 text-meta text-on-surface-variant">
                          {row.customerIdentityKey}
                        </div>
                      ) : null}
                    </DataTableCell>
                    <DataTableCell numeric>
                      <Num>{feeText(row.feeAmount, row.feeCurrency, p.unknownCurrency)}</Num>
                    </DataTableCell>
                    <DataTableCell>
                      {row.recordedAt ? formatPlatformDateTime(row.recordedAt, locale) : '—'}
                    </DataTableCell>
                    <DataTableCell>
                      {row.reversedAt ? formatPlatformDateTime(row.reversedAt, locale) : '—'}
                    </DataTableCell>
                    <DataTableCell>{row.createdVia || '—'}</DataTableCell>
                  </DataTableRow>
                ))}
              </DataTableBody>
            </DataTable>
          ) : null}
        </Card>
      ) : null}
    </PlatformListPage>
  )
}
