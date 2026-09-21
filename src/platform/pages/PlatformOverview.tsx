import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getPlatformDashboard, type PlatformDashboardDto } from '@/platform/api/platformAdmin'
import { userFacingApiError } from '@/lib/platformErrors'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { ErrorState } from '@/components/ui/ErrorState'
import { SkeletonStats, SkeletonCard } from '@/components/ui/Skeleton'
import { StatCard } from '@/components/ui/StatCard'
import { MaterialIcon } from '@/components/ui/Icon'
import { Num } from '@/components/ui/Num'
import { useLocale } from '@/context/LocaleContext'
import { useToast } from '@/context/ToastContext'
import { pickNumber } from '@/lib/analyticsPayload'
import { usePlatformAccess } from '@/platform/auth/usePlatformAccess'
import { DateRangeFilter } from '@/platform/ui/DateRangeFilter'
import { formatPlatformDateTime, isoDaysAgo, isWithinMaxPlatformRange, todayIso } from '@/platform/ui/dates'
import { asRecord } from '@/platform/ui/recordFields'

function formatCount(payload: Record<string, unknown> | undefined, key: string): string {
  const n = pickNumber(payload ?? {}, [key])
  return n === null ? '—' : n.toLocaleString()
}

function metricSurface(key: string): string {
  if (['active', 'accepted', 'recorded'].includes(key)) {
    return 'bg-success-subtle text-on-success-subtle'
  }
  if (['suspended', 'queued', 'pending', 'notAttempted'].includes(key)) {
    return 'bg-warning-subtle text-on-warning-subtle'
  }
  if (['deleted', 'failed', 'cancelled', 'expired', 'reversed'].includes(key)) {
    return 'bg-danger-subtle text-on-danger-subtle'
  }
  return 'bg-surface-container-lowest text-on-surface'
}

function MetricGrid({
  payload,
  items,
  emptyLabel,
}: {
  payload: Record<string, unknown>
  items: Array<{ key: string; label: string; icon?: string }>
  emptyLabel: string
}) {
  const fields = items
    .map((item) => ({ ...item, value: formatCount(payload, item.key) }))
    .filter((item) => item.value !== '—')

  if (fields.length === 0) {
    return <p className="mt-4 text-body-sm text-on-surface-variant">{emptyLabel}</p>
  }

  return (
    <dl className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
      {fields.map(({ key, label, value, icon }) => (
        <div key={key} className={`rounded-lg px-3.5 py-3 ${metricSurface(key)}`}>
          <dt className="flex items-center gap-1.5 text-overline opacity-80">
            {icon ? <MaterialIcon name={icon} size={13} /> : null}
            {label}
          </dt>
          <dd className="text-headline-sm mt-1 nums truncate">
            <Num>{value}</Num>
          </dd>
        </div>
      ))}
    </dl>
  )
}

function AcquisitionCurrencies({
  payload,
  title,
  columns,
}: {
  payload: Record<string, unknown>
  title: string
  columns: {
    currency: string
    recorded: string
    recordedTotal: string
    reversed: string
    reversedTotal: string
  }
}) {
  const currencies = payload.currencies
  if (!Array.isArray(currencies) || currencies.length === 0) return null

  return (
    <div className="mt-4 overflow-x-auto rounded-lg border border-outline-variant/40">
      <p className="px-3.5 py-2 text-overline text-on-surface-variant">{title}</p>
      <table className="w-full text-start text-body-sm">
        <thead className="bg-surface-container-low text-on-surface-variant">
          <tr>
            <th className="px-3.5 py-2 font-medium">{columns.currency}</th>
            <th className="px-3.5 py-2 font-medium">{columns.recorded}</th>
            <th className="px-3.5 py-2 font-medium">{columns.recordedTotal}</th>
            <th className="px-3.5 py-2 font-medium">{columns.reversed}</th>
            <th className="px-3.5 py-2 font-medium">{columns.reversedTotal}</th>
          </tr>
        </thead>
        <tbody>
          {currencies.map((row, index) => {
            const rec = asRecord(row)
            return (
              <tr key={String(rec.currency ?? index)} className="border-t border-outline-variant/30">
                <td className="px-3.5 py-2">{String(rec.currency ?? '—')}</td>
                <td className="px-3.5 py-2">
                  <Num>{String(rec.recordedCount ?? '—')}</Num>
                </td>
                <td className="px-3.5 py-2">
                  <Num>{String(rec.recordedTotal ?? '—')}</Num>
                </td>
                <td className="px-3.5 py-2">
                  <Num>{String(rec.reversedCount ?? '—')}</Num>
                </td>
                <td className="px-3.5 py-2">
                  <Num>{String(rec.reversedTotal ?? '—')}</Num>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

export function PlatformOverviewPage() {
  const { t, locale } = useLocale()
  const { toast } = useToast()
  const { canQuery } = usePlatformAccess()
  const navigate = useNavigate()
  const p = t.platform.dashboard

  const [from, setFrom] = useState(() => isoDaysAgo(30))
  const [to, setTo] = useState(() => todayIso())
  const [applied, setApplied] = useState(() => ({ from: isoDaysAgo(30), to: todayIso() }))
  const [data, setData] = useState<PlatformDashboardDto | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [loaded, setLoaded] = useState(false)

  const load = useCallback(
    async (signal?: AbortSignal) => {
      if (!canQuery) {
        setLoading(false)
        setData(null)
        setError(null)
        return
      }

      setLoading(true)
      setError(null)
      try {
        const result = await getPlatformDashboard(applied.from, applied.to, signal)
        if (!signal?.aborted) setData(result)
      } catch (err) {
        if (signal?.aborted) return
        setError(userFacingApiError(err, t, p.errorLoad))
        setData(null)
      } finally {
        if (!signal?.aborted) {
          setLoading(false)
          setLoaded(true)
        }
      }
    },
    [applied, canQuery, p.errorLoad, t],
  )

  useEffect(() => {
    const ac = new AbortController()
    void load(ac.signal)
    return () => ac.abort()
  }, [load])

  const applyRange = (): void => {
    if (!isWithinMaxPlatformRange(from, to)) {
      toast('error', t.platform.common.rangeTooLong)
      return
    }
    setApplied({ from, to })
  }

  const restaurants = asRecord(data?.restaurants)
  const organizations = asRecord(data?.organizations)
  const subscriptions = asRecord(data?.subscriptions)
  const messaging = asRecord(data?.messaging)
  const acquisition = asRecord(data?.acquisition)

  return (
    <div className="space-y-6">
      <PageHeader className="mb-0" title={p.title} subtitle={p.subtitle} icon="dashboard" />

      <DateRangeFilter
        from={from}
        to={to}
        onFromChange={setFrom}
        onToChange={setTo}
        fromLabel={p.from}
        toLabel={p.to}
        actions={
          <Button variant="secondary" onClick={applyRange} loading={loading} disabled={!canQuery}>
            {p.apply}
          </Button>
        }
        summary={
          data?.generatedAt
            ? `${p.generatedAt}: ${formatPlatformDateTime(String(data.generatedAt), locale)}`
            : undefined
        }
      />

      {!canQuery && (
        <Card padding="none">
          <EmptyState
            icon="lock"
            title={p.needAuthTitle}
            description={p.needAuthBody}
            action={
              <Button onClick={() => navigate('/platform/login')}>{t.platform.preview.signIn}</Button>
            }
          />
        </Card>
      )}

      {canQuery && error && !loading && (
        <Card padding="none">
          <ErrorState
            title={p.errorTitle}
            description={p.errorBody}
            detail={error}
            retryLabel={t.common.retry}
            onRetry={() => void load()}
          />
        </Card>
      )}

      {canQuery && loading && !data && (
        <>
          <SkeletonStats />
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {Array.from({ length: 4 }, (_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        </>
      )}

      {canQuery && loaded && !loading && !data && !error && (
        <Card padding="none">
          <EmptyState
            icon="dashboard"
            title={p.emptyTitle}
            description={p.emptyBody}
            action={
              <Button variant="secondary" onClick={applyRange}>
                {p.apply}
              </Button>
            }
          />
        </Card>
      )}

      {data && (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              title={p.restaurants}
              value={formatCount(restaurants, 'total')}
              subtitle={`${formatCount(restaurants, 'active')} ${p.kpiActive}`}
              icon="restaurant"
              variant="primary"
              emphasis
            />
            <StatCard
              title={p.organizations}
              value={formatCount(organizations, 'total')}
              subtitle={`${formatCount(organizations, 'active')} ${p.kpiActive}`}
              icon="corporate_fare"
            />
            <StatCard
              title={p.subscriptions}
              value={formatCount(subscriptions, 'active')}
              subtitle={`${formatCount(subscriptions, 'total')} ${p.kpiTotal}`}
              icon="credit_card"
              variant="success"
            />
            <StatCard
              title={p.messaging}
              value={formatCount(messaging, 'total')}
              subtitle={`${formatCount(messaging, 'failed')} ${p.kpiFailed}`}
              icon="forum"
              variant={formatCount(messaging, 'failed') === '—' || formatCount(messaging, 'failed') === '0' ? 'default' : 'danger'}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Card>
              <div className="flex items-center gap-2.5">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary-subtle text-primary">
                  <MaterialIcon name="restaurant" size={15} />
                </span>
                <CardTitle>{p.restaurants}</CardTitle>
              </div>
              <MetricGrid
                payload={restaurants}
                emptyLabel={p.sectionEmpty}
                items={[
                  { key: 'total', label: p.metricTotal, icon: 'restaurant' },
                  { key: 'active', label: p.metricActive, icon: 'check_circle' },
                  { key: 'suspended', label: p.metricSuspended, icon: 'pause_circle' },
                  { key: 'deleted', label: p.metricDeleted, icon: 'cancel' },
                ]}
              />
            </Card>
            <Card>
              <div className="flex items-center gap-2.5">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary-subtle text-primary">
                  <MaterialIcon name="corporate_fare" size={15} />
                </span>
                <CardTitle>{p.organizations}</CardTitle>
              </div>
              <MetricGrid
                payload={organizations}
                emptyLabel={p.sectionEmpty}
                items={[
                  { key: 'total', label: p.metricTotal, icon: 'corporate_fare' },
                  { key: 'active', label: p.metricActive, icon: 'check_circle' },
                  { key: 'suspended', label: p.metricSuspended, icon: 'pause_circle' },
                  { key: 'deleted', label: p.metricDeleted, icon: 'cancel' },
                ]}
              />
            </Card>
            <Card>
              <div className="flex items-center gap-2.5">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary-subtle text-primary">
                  <MaterialIcon name="credit_card" size={15} />
                </span>
                <CardTitle>{p.subscriptions}</CardTitle>
              </div>
              <MetricGrid
                payload={subscriptions}
                emptyLabel={p.sectionEmpty}
                items={[
                  { key: 'total', label: p.metricTotal, icon: 'credit_card' },
                  { key: 'active', label: p.metricActive, icon: 'check_circle' },
                  { key: 'suspended', label: p.metricSuspended, icon: 'pause_circle' },
                  { key: 'cancelled', label: p.metricCancelled, icon: 'block' },
                  { key: 'expired', label: p.metricExpired, icon: 'event_busy' },
                ]}
              />
            </Card>
            <Card>
              <div className="flex items-center gap-2.5">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary-subtle text-primary">
                  <MaterialIcon name="forum" size={15} />
                </span>
                <CardTitle>{p.messaging}</CardTitle>
              </div>
              <MetricGrid
                payload={messaging}
                emptyLabel={p.sectionEmpty}
                items={[
                  { key: 'total', label: p.metricTotal, icon: 'forum' },
                  { key: 'notAttempted', label: p.metricNotAttempted, icon: 'hourglass_empty' },
                  { key: 'queued', label: p.metricQueued, icon: 'schedule' },
                  { key: 'accepted', label: p.metricAccepted, icon: 'check_circle' },
                  { key: 'failed', label: p.metricFailed, icon: 'cancel' },
                ]}
              />
            </Card>
            <Card className="lg:col-span-2">
              <div className="flex items-center gap-2.5">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary-subtle text-primary">
                  <MaterialIcon name="campaign" size={15} />
                </span>
                <CardTitle>{p.acquisition}</CardTitle>
              </div>
              <AcquisitionCurrencies
                payload={acquisition}
                title={p.currencies}
                columns={{
                  currency: p.colCurrency,
                  recorded: p.colRecorded,
                  recordedTotal: p.colRecordedTotal,
                  reversed: p.colReversed,
                  reversedTotal: p.colReversedTotal,
                }}
              />
              {!Array.isArray(acquisition.currencies) || acquisition.currencies.length === 0 ? (
                <p className="mt-4 text-body-sm text-on-surface-variant">{p.sectionEmpty}</p>
              ) : null}
            </Card>
          </div>
        </>
      )}
    </div>
  )
}
