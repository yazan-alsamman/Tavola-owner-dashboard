import { useCallback, useEffect, useState } from 'react'
import {
  exportPlatformRevenue,
  getPlatformRevenueReport,
  type RevenueGroupBy,
  type RevenueReportDto,
} from '@/platform/api/platformAdmin'
import { isApiError } from '@/api/errors'
import { Select } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { StatCard } from '@/components/ui/StatCard'
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
import { DateRangeFilter } from '@/platform/ui/DateRangeFilter'
import { isoDaysAgo, todayIso } from '@/platform/ui/dates'
import { PlatformListPage } from '@/platform/ui/PlatformListPage'

const GROUP_BY_OPTIONS: RevenueGroupBy[] = [
  'day',
  'week',
  'month',
  'quarter',
  'year',
  'restaurant',
  'organization',
  'source',
]

function formatMoney(value: number | undefined): string {
  if (value === undefined || Number.isNaN(value)) return '—'
  return value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export function PlatformRevenuePage() {
  const { t } = useLocale()
  const { toast } = useToast()
  const { canQuery } = usePlatformAccess()
  const p = t.platform.revenue

  const [from, setFrom] = useState(() => isoDaysAgo(30))
  const [to, setTo] = useState(() => todayIso())
  const [groupBy, setGroupBy] = useState<RevenueGroupBy>('day')
  const [applied, setApplied] = useState(() => ({
    from: isoDaysAgo(30),
    to: todayIso(),
    groupBy: 'day' as RevenueGroupBy,
  }))
  const [report, setReport] = useState<RevenueReportDto | null>(null)
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
        setLoading(false)
        setError(null)
        return
      }
      setLoading(true)
      setError(null)
      try {
        const result = await getPlatformRevenueReport(applied, signal)
        if (!signal?.aborted) setReport(result)
      } catch (err) {
        if (signal?.aborted) return
        setError(isApiError(err) ? err.message : p.errorLoad)
        setReport(null)
      } finally {
        if (!signal?.aborted) setLoading(false)
      }
    },
    [applied, canQuery, p.errorLoad],
  )

  useEffect(() => {
    const ac = new AbortController()
    void load(ac.signal)
    return () => ac.abort()
  }, [load])

  const buckets = report?.buckets ?? []
  const recordedTotal = buckets.reduce((sum, bucket) => sum + (bucket.recordedTotal ?? 0), 0)
  const reversedTotal = buckets.reduce((sum, bucket) => sum + (bucket.reversedTotal ?? 0), 0)

  const handleExport = async (): Promise<void> => {
    setExporting(true)
    try {
      const data = await exportPlatformRevenue({ from: applied.from, to: applied.to })
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `tavola-revenue-${applied.from}-${applied.to}.json`
      link.click()
      URL.revokeObjectURL(url)
      toast('success', p.exportSuccess)
    } catch (err) {
      toast('error', isApiError(err) ? err.message : p.exportError)
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
          }
          actions={
            <Button
              variant="secondary"
              onClick={() => setApplied({ from, to, groupBy })}
              loading={loading}
            >
              {p.apply}
            </Button>
          }
        />
      }
    >
      <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <StatCard title={p.summaryRecorded} value={formatMoney(recordedTotal)} icon="payments" variant="success" />
        <StatCard title={p.summaryReversed} value={formatMoney(reversedTotal)} icon="payments" variant="warning" />
      </div>
      <DataTable>
        <DataTableHead>
          <DataTableHeader>{p.colKey}</DataTableHeader>
          <DataTableHeader>{p.colCurrency}</DataTableHeader>
          <DataTableHeader numeric>{p.colRecordedCount}</DataTableHeader>
          <DataTableHeader numeric>{p.colRecordedTotal}</DataTableHeader>
          <DataTableHeader numeric>{p.colReversedCount}</DataTableHeader>
          <DataTableHeader numeric>{p.colReversedTotal}</DataTableHeader>
        </DataTableHead>
        <DataTableBody>
          {buckets.map((bucket) => (
            <DataTableRow key={`${bucket.key}-${bucket.currency ?? ''}`}>
              <DataTableCell className="font-medium">{bucket.key}</DataTableCell>
              <DataTableCell>{bucket.currency ?? '—'}</DataTableCell>
              <DataTableCell numeric>
                <Num>{bucket.recordedCount ?? '—'}</Num>
              </DataTableCell>
              <DataTableCell numeric>
                <Num>{formatMoney(bucket.recordedTotal)}</Num>
              </DataTableCell>
              <DataTableCell numeric>
                <Num>{bucket.reversedCount ?? '—'}</Num>
              </DataTableCell>
              <DataTableCell numeric>
                <Num>{formatMoney(bucket.reversedTotal)}</Num>
              </DataTableCell>
            </DataTableRow>
          ))}
        </DataTableBody>
      </DataTable>
    </PlatformListPage>
  )
}
