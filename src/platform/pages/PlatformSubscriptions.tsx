import { useCallback, useEffect, useState } from 'react'
import {
  assignOrganizationSubscription,
  cancelOrganizationSubscription,
  getOrganizationSubscription,
  listPlatformPlans,
  reactivateOrganizationSubscription,
  searchPlatformOrganizations,
  suspendOrganizationSubscription,
  type PlatformOrganizationLookupDto,
} from '@/platform/api/platformAdmin'
import { isApiError } from '@/api/errors'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { FilterBar } from '@/components/ui/FilterBar'
import { Card, CardTitle } from '@/components/ui/Card'
import { ConfirmDialog } from '@/components/ui/Modal'
import {
  DataTable,
  DataTableHead,
  DataTableHeader,
  DataTableBody,
  DataTableRow,
  DataTableCell,
} from '@/components/ui/DataTable'
import { MaterialIcon } from '@/components/ui/Icon'
import { useLocale } from '@/context/LocaleContext'
import { useToast } from '@/context/ToastContext'
import { usePlatformAccess } from '@/platform/auth/usePlatformAccess'
import { CopyId } from '@/platform/ui/CopyId'
import { PlatformListPage } from '@/platform/ui/PlatformListPage'
import { PlatformStatusBadge } from '@/platform/ui/PlatformStatusBadge'
import { RecordDl } from '@/platform/ui/RecordDl'
import { asRecord, pickRaw } from '@/platform/ui/recordFields'
import { useDebouncedValue } from '@/platform/ui/useDebouncedValue'

type SubscriptionAction = 'assign' | 'cancel' | 'suspend' | 'reactivate'

function toRows(
  data: { items?: Record<string, unknown>[] } | Record<string, unknown>[] | null,
): Record<string, unknown>[] {
  if (!data) return []
  if (Array.isArray(data)) return data
  return data.items ?? []
}

export function PlatformSubscriptionsPage() {
  const { t } = useLocale()
  const { toast } = useToast()
  const { canQuery, canMutate } = usePlatformAccess()
  const p = t.platform.subscriptions

  const [pickerQ, setPickerQ] = useState('')
  const debouncedPicker = useDebouncedValue(pickerQ, 300)
  const [matches, setMatches] = useState<PlatformOrganizationLookupDto[]>([])
  const [selected, setSelected] = useState<PlatformOrganizationLookupDto | null>(null)
  const [subscription, setSubscription] = useState<Record<string, unknown> | null>(null)
  const [plans, setPlans] = useState<Record<string, unknown>[]>([])
  const [planId, setPlanId] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searched, setSearched] = useState(false)
  const [pending, setPending] = useState<SubscriptionAction | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!canQuery || debouncedPicker.trim().length < 1) {
      setMatches([])
      return
    }
    const ac = new AbortController()
    void searchPlatformOrganizations({ q: debouncedPicker.trim(), page: 1, pageSize: 8 }, ac.signal)
      .then((result) => {
        if (!ac.signal.aborted) setMatches(result.items ?? [])
      })
      .catch(() => {
        if (!ac.signal.aborted) setMatches([])
      })
    return () => ac.abort()
  }, [canQuery, debouncedPicker])

  useEffect(() => {
    if (!canQuery) {
      setPlans([])
      return
    }
    const ac = new AbortController()
    void listPlatformPlans(ac.signal)
      .then((planResult) => {
        if (!ac.signal.aborted) setPlans(toRows(planResult))
      })
      .catch(() => {
        if (!ac.signal.aborted) setPlans([])
      })
    return () => ac.abort()
  }, [canQuery])

  const load = useCallback(
    async (signal?: AbortSignal) => {
      if (!canQuery || !selected) {
        setSubscription(null)
        setLoading(false)
        return
      }
      setLoading(true)
      setError(null)
      setSearched(true)
      try {
        const sub = await getOrganizationSubscription(selected.id, signal)
        if (signal?.aborted) return
        setSubscription(asRecord(sub))
      } catch (err) {
        if (signal?.aborted) return
        setError(isApiError(err) ? err.message : p.errorLoad)
        setSubscription(null)
      } finally {
        if (!signal?.aborted) setLoading(false)
      }
    },
    [canQuery, selected, p.errorLoad],
  )

  useEffect(() => {
    if (!selected) return
    const ac = new AbortController()
    void load(ac.signal)
    return () => ac.abort()
  }, [load, selected])

  const confirmCopy: Record<SubscriptionAction, string> = {
    assign: p.confirmAssign,
    cancel: p.confirmCancel,
    suspend: p.confirmSuspend,
    reactivate: p.confirmReactivate,
  }

  const runPending = async (): Promise<void> => {
    if (!pending || !selected) return
    if (pending === 'assign' && !planId.trim()) {
      toast('error', p.assignValidation)
      return
    }
    setBusy(true)
    try {
      if (pending === 'assign') {
        await assignOrganizationSubscription(selected.id, { planId: planId.trim() })
        toast('success', p.assignSuccess)
      } else if (pending === 'cancel') {
        await cancelOrganizationSubscription(selected.id)
        toast('success', p.actionSuccess)
      } else if (pending === 'suspend') {
        await suspendOrganizationSubscription(selected.id)
        toast('success', p.actionSuccess)
      } else {
        await reactivateOrganizationSubscription(selected.id)
        toast('success', p.actionSuccess)
      }
      setPending(null)
      await load()
    } catch (err) {
      toast('error', isApiError(err) ? err.message : pending === 'assign' ? p.assignError : p.actionError)
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <PlatformListPage
        title={p.title}
        subtitle={p.subtitle}
        canQuery={canQuery}
        loading={loading}
        hasRows={subscription !== null || plans.length > 0}
        error={error}
        onRetry={() => void load()}
        emptyIcon="credit_card"
        emptyTitle={searched ? p.emptyTitle : p.promptTitle}
        emptyBody={searched ? p.emptyBody : p.promptBody}
        filters={
          <FilterBar
            actions={
              <Button
                type="button"
                variant="secondary"
                disabled={!selected}
                onClick={() => void load()}
              >
                {p.load}
              </Button>
            }
          >
            <div className="relative min-w-[240px] flex-1">
              <Input
                label={p.organization}
                value={selected ? (selected.name ?? selected.id) : pickerQ}
                onChange={(e) => {
                  setSelected(null)
                  setPickerQ(e.target.value)
                  setSearched(false)
                  setSubscription(null)
                }}
                placeholder={p.organizationPlaceholder}
                icon={<MaterialIcon name="search" size={18} />}
              />
              {!selected && matches.length > 0 && (
                <ul className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-lg border border-outline-variant/60 bg-surface-container-lowest elev-2">
                  {matches.map((row) => (
                    <li key={row.id}>
                      <button
                        type="button"
                        className="w-full px-3 py-2 text-start text-body-sm hover:bg-surface-container-high"
                        onClick={() => {
                          setSelected(row)
                          setPickerQ('')
                          setMatches([])
                        }}
                      >
                        <span className="font-medium">{row.name ?? row.slug ?? row.id}</span>
                        {row.slug && (
                          <span className="ms-2 text-on-surface-variant">{row.slug}</span>
                        )}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </FilterBar>
        }
      >
        <div className="space-y-8">
          {subscription && (
            <section className="space-y-4">
              <CardTitle>{p.detailsTitle}</CardTitle>
              <RecordDl record={subscription} />
              <Card className="max-w-xl space-y-4">
                <Input
                  label={p.planId}
                  hint={p.planHint}
                  value={planId}
                  onChange={(e) => setPlanId(e.target.value)}
                  disabled={!canMutate || busy}
                />
                <div className="flex flex-wrap gap-2">
                  <Button
                    disabled={!canMutate || busy}
                    onClick={() => setPending('assign')}
                  >
                    {p.assign}
                  </Button>
                  <Button
                    variant="outline"
                    disabled={!canMutate || busy}
                    onClick={() => setPending('suspend')}
                  >
                    {p.suspend}
                  </Button>
                  <Button
                    variant="secondary"
                    disabled={!canMutate || busy}
                    onClick={() => setPending('reactivate')}
                  >
                    {p.reactivate}
                  </Button>
                  <Button
                    variant="danger"
                    disabled={!canMutate || busy}
                    onClick={() => setPending('cancel')}
                  >
                    {p.cancel}
                  </Button>
                </div>
              </Card>
            </section>
          )}

          <section>
            <CardTitle className="mb-4">{p.plansTitle}</CardTitle>
            {plans.length === 0 ? (
              <p className="text-body-sm text-on-surface-variant">{p.plansEmpty}</p>
            ) : (
              <DataTable>
                <DataTableHead>
                  <DataTableHeader>{p.colPlanId}</DataTableHeader>
                  <DataTableHeader>{p.colName}</DataTableHeader>
                  <DataTableHeader>{p.colSlug}</DataTableHeader>
                  <DataTableHeader>{p.colStatus}</DataTableHeader>
                </DataTableHead>
                <DataTableBody>
                  {plans.map((raw, index) => {
                    const row = asRecord(raw)
                    const id = String(pickRaw(row, ['planId', 'id']) ?? index)
                    return (
                      <DataTableRow key={id}>
                        <DataTableCell>
                          <CopyId value={id} copyLabel={t.common.copy} copiedLabel={t.common.copied} />
                        </DataTableCell>
                        <DataTableCell className="font-medium">
                          {String(pickRaw(row, ['name', 'label']) ?? '—')}
                        </DataTableCell>
                        <DataTableCell>{String(pickRaw(row, ['slug']) ?? '—')}</DataTableCell>
                        <DataTableCell>
                          <PlatformStatusBadge status={String(pickRaw(row, ['status']) ?? '')} />
                        </DataTableCell>
                      </DataTableRow>
                    )
                  })}
                </DataTableBody>
              </DataTable>
            )}
          </section>
        </div>
      </PlatformListPage>

      <ConfirmDialog
        open={pending !== null}
        onClose={() => {
          if (!busy) setPending(null)
        }}
        onConfirm={() => {
          void runPending()
        }}
        title={t.platform.common.confirmTitle}
        message={pending ? confirmCopy[pending] : ''}
        confirmLabel={t.common.confirm}
        cancelLabel={t.common.cancel}
        variant={pending === 'cancel' ? 'danger' : 'primary'}
        busy={busy}
        closeOnConfirm={false}
      />
    </>
  )
}
