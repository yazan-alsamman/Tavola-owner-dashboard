import { useCallback, useEffect, useState } from 'react'
import { listPlatformAuditLogs, type PlatformAdminAccountDto } from '@/platform/api/platformAdmin'
import { userFacingApiError } from '@/lib/platformErrors'
import { Input, Select } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import {
  DataTable,
  DataTableHead,
  DataTableHeader,
  DataTableBody,
  DataTableRow,
  DataTableCell,
} from '@/components/ui/DataTable'
import { useLocale } from '@/context/LocaleContext'
import { useToast } from '@/context/ToastContext'
import { usePlatformAccess } from '@/platform/auth/usePlatformAccess'
import { AdminPicker, OrganizationPicker } from '@/platform/ui/EntitySearchPicker'
import { DateRangeFilter } from '@/platform/ui/DateRangeFilter'
import { formatPlatformDateTime, isoDaysAgo, isWithinMaxPlatformRange, todayIso } from '@/platform/ui/dates'
import { PaginationBar } from '@/platform/ui/PaginationBar'
import { PlatformListPage } from '@/platform/ui/PlatformListPage'
import { asRecord, pickRaw } from '@/platform/ui/recordFields'
import type { PlatformOrganizationLookupDto } from '@/platform/api/platformAdmin'

const PAGE_SIZE = 20

export function PlatformAuditLogsPage() {
  const { t, locale } = useLocale()
  const { toast } = useToast()
  const { canQuery } = usePlatformAccess()
  const p = t.platform.auditLogs

  const [from, setFrom] = useState(() => isoDaysAgo(7))
  const [to, setTo] = useState(() => todayIso())
  const [action, setAction] = useState('')
  const [organization, setOrganization] = useState<PlatformOrganizationLookupDto | null>(null)
  const [actor, setActor] = useState<PlatformAdminAccountDto | null>(null)
  const [targetType, setTargetType] = useState('')
  const [applied, setApplied] = useState(() => ({
    from: isoDaysAgo(7),
    to: todayIso(),
    action: '',
    organizationId: '',
    actorId: '',
    targetType: '',
  }))
  const [page, setPage] = useState(1)
  const [items, setItems] = useState<Record<string, unknown>[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(
    async (signal?: AbortSignal) => {
      if (!canQuery) {
        setItems([])
        setTotal(0)
        setLoading(false)
        setError(null)
        return
      }
      setLoading(true)
      setError(null)
      try {
        const result = await listPlatformAuditLogs(
          {
            from: applied.from,
            to: applied.to,
            page,
            pageSize: PAGE_SIZE,
            action: applied.action || undefined,
            organizationId: applied.organizationId || undefined,
            actorId: applied.actorId || undefined,
            targetType: applied.targetType || undefined,
          },
          signal,
        )
        if (!signal?.aborted) {
          setItems(result.items ?? [])
          setTotal(result.total ?? 0)
        }
      } catch (err) {
        if (signal?.aborted) return
        setError(userFacingApiError(err, t, p.errorLoad))
        setItems([])
        setTotal(0)
      } finally {
        if (!signal?.aborted) setLoading(false)
      }
    },
    [applied, canQuery, page, p.errorLoad, t],
  )

  useEffect(() => {
    const ac = new AbortController()
    void load(ac.signal)
    return () => ac.abort()
  }, [load])

  return (
    <PlatformListPage
      title={p.title}
      subtitle={p.subtitle}
      canQuery={canQuery}
      loading={loading}
      hasRows={items.length > 0}
      error={error}
      onRetry={() => void load()}
      emptyIcon="history"
      emptyTitle={p.emptyTitle}
      emptyBody={p.emptyBody}
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
              <Input
                label={p.action}
                value={action}
                onChange={(e) => setAction(e.target.value)}
                placeholder={p.actionPlaceholder}
              />
              <OrganizationPicker
                selected={organization}
                onSelect={setOrganization}
                label={p.organization}
              />
              <AdminPicker selected={actor} onSelect={setActor} label={p.actor} hint={p.actorHint} />
              <Select
                label={p.targetType}
                value={targetType}
                onChange={(e) => setTargetType(e.target.value)}
              >
                <option value="">{p.targetTypeAll}</option>
                <option value="Restaurant">{p.targetTypeRestaurant}</option>
                <option value="Organization">{p.targetTypeOrganization}</option>
                <option value="Account">{p.targetTypeAccount}</option>
              </Select>
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
                setPage(1)
                setApplied({
                  from,
                  to,
                  action: action.trim(),
                  organizationId: organization?.id ?? '',
                  actorId: actor?.userId || actor?.id || '',
                  targetType,
                })
              }}
            >
              {p.apply}
            </Button>
          }
        />
      }
    >
      <DataTable>
        <DataTableHead>
          <DataTableHeader>{p.colTime}</DataTableHeader>
          <DataTableHeader>{p.colAction}</DataTableHeader>
          <DataTableHeader>{p.colActor}</DataTableHeader>
          <DataTableHeader>{p.colOrganization}</DataTableHeader>
          <DataTableHeader>{p.colTarget}</DataTableHeader>
        </DataTableHead>
        <DataTableBody>
          {items.map((raw, index) => {
            const row = asRecord(raw)
            const id = String(pickRaw(row, ['id']) ?? index)
            const actor = String(pickRaw(row, ['actorEmail', 'actorName', 'actor']) ?? '')
            const orgName = String(
              pickRaw(row, ['organizationName', 'organization', 'orgName']) ?? '',
            )
            const targetType = String(pickRaw(row, ['targetType']) ?? '')
            const targetName = String(
              pickRaw(row, ['targetName', 'restaurantName']) ?? '',
            )
            const target = targetName || targetType || '—'
            return (
              <DataTableRow key={id}>
                <DataTableCell>
                  {formatPlatformDateTime(
                    String(pickRaw(row, ['createdAt', 'timestamp', 'occurredAt']) ?? ''),
                    locale,
                  )}
                </DataTableCell>
                <DataTableCell className="font-medium">
                  {String(pickRaw(row, ['action']) ?? '—')}
                </DataTableCell>
                <DataTableCell>{actor || '—'}</DataTableCell>
                <DataTableCell>{orgName || '—'}</DataTableCell>
                <DataTableCell className="max-w-[240px] truncate">
                  {target}
                </DataTableCell>
              </DataTableRow>
            )
          })}
        </DataTableBody>
      </DataTable>
      <PaginationBar
        page={page}
        pageSize={PAGE_SIZE}
        total={total}
        onPageChange={setPage}
        previousLabel={t.common.previous}
        nextLabel={t.common.next}
        summaryTemplate={t.common.pageSummary}
      />
    </PlatformListPage>
  )
}
