import { useCallback, useEffect, useState } from 'react'
import {
  assignOrganizationSubscription,
  cancelOrganizationSubscription,
  getOrganizationSubscription,
  listPlatformPlans,
  reactivateOrganizationSubscription,
  suspendOrganizationSubscription,
  type PlatformOrganizationLookupDto,
} from '@/platform/api/platformAdmin'
import { userFacingApiError } from '@/lib/platformErrors'
import { Select } from '@/components/ui/Input'
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
import { OrganizationPicker } from '@/platform/ui/EntitySearchPicker'
import { PlatformListPage } from '@/platform/ui/PlatformListPage'
import { PlatformStatusBadge } from '@/platform/ui/PlatformStatusBadge'
import { RecordDl } from '@/platform/ui/RecordDl'
import { asRecord, pickRaw } from '@/platform/ui/recordFields'
import { platformRowAccent } from '@/platform/ui/statusTone'

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
        setError(userFacingApiError(err, t, p.errorLoad))
        setSubscription(null)
      } finally {
        if (!signal?.aborted) setLoading(false)
      }
    },
    [canQuery, selected, p.errorLoad, t],
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
      toast('error', userFacingApiError(err, t, pending === 'assign' ? p.assignError : p.actionError))
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
          <FilterBar>
            <OrganizationPicker
              selected={selected}
              onSelect={(row) => {
                setSelected(row)
                setSearched(false)
                setSubscription(null)
              }}
              disabled={!canQuery}
              label={p.organization}
            />
          </FilterBar>
        }
      >
        <div className="space-y-8">
          {subscription && (
            <section className="space-y-4">
              <CardTitle>{p.detailsTitle}</CardTitle>
              <RecordDl record={subscription} />
              <Card className="max-w-xl space-y-4">
                <Select
                  label={p.plan}
                  hint={p.planHint}
                  value={planId}
                  onChange={(e) => setPlanId(e.target.value)}
                  disabled={!canMutate || busy}
                >
                  <option value="">{p.planPlaceholder}</option>
                  {plans.map((raw, index) => {
                    const row = asRecord(raw)
                    const id = String(pickRaw(row, ['planId', 'id']) ?? index)
                    return (
                      <option key={id} value={id}>
                        {String(pickRaw(row, ['name', 'label']) ?? id)}
                      </option>
                    )
                  })}
                </Select>
                <div className="flex flex-wrap gap-2">
                  <Button
                    disabled={!canMutate || busy}
                    onClick={() => setPending('assign')}
                  >
                    <MaterialIcon name="credit_card" size={16} />
                    {p.assign}
                  </Button>
                  <Button
                    variant="outline"
                    disabled={!canMutate || busy}
                    onClick={() => setPending('suspend')}
                  >
                    <MaterialIcon name="pause" size={16} />
                    {p.suspend}
                  </Button>
                  <Button
                    variant="secondary"
                    disabled={!canMutate || busy}
                    onClick={() => setPending('reactivate')}
                  >
                    <MaterialIcon name="play_arrow" size={16} />
                    {p.reactivate}
                  </Button>
                  <Button
                    variant="danger"
                    disabled={!canMutate || busy}
                    onClick={() => setPending('cancel')}
                  >
                    <MaterialIcon name="cancel" size={16} />
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
                  <DataTableHeader>{p.colName}</DataTableHeader>
                  <DataTableHeader>{p.colSlug}</DataTableHeader>
                  <DataTableHeader>{p.colStatus}</DataTableHeader>
                </DataTableHead>
                <DataTableBody>
                  {plans.map((raw, index) => {
                    const row = asRecord(raw)
                    const id = String(pickRaw(row, ['planId', 'id']) ?? index)
                    const status = String(pickRaw(row, ['status']) ?? '')
                    return (
                      <DataTableRow key={id} accent={platformRowAccent(status)}>
                        <DataTableCell className="font-medium">
                          {String(pickRaw(row, ['name', 'label']) ?? '—')}
                        </DataTableCell>
                        <DataTableCell>{String(pickRaw(row, ['slug']) ?? '—')}</DataTableCell>
                        <DataTableCell>
                          <PlatformStatusBadge status={status} />
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
