import { useCallback, useEffect, useState } from 'react'
import {
  activatePlatformPricingRule,
  listPlatformPlans,
  listPlatformPricingRules,
  simulatePlatformPricing,
  type PlatformOrganizationLookupDto,
  type PlatformRestaurantLookupDto,
  type PricingScopeType,
} from '@/platform/api/platformAdmin'
import { isApiError } from '@/api/errors'
import { Card, CardTitle } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { Input, Select } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { ConfirmDialog } from '@/components/ui/Modal'
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
import { isoDaysAgo } from '@/platform/ui/dates'
import { PlatformListPage } from '@/platform/ui/PlatformListPage'
import { PlatformStatusBadge } from '@/platform/ui/PlatformStatusBadge'
import { RecordDl } from '@/platform/ui/RecordDl'
import { asRecord, pickRaw } from '@/platform/ui/recordFields'
import { platformRowAccent } from '@/platform/ui/statusTone'

function toRows(
  data: { items?: Record<string, unknown>[] } | Record<string, unknown>[] | null,
): Record<string, unknown>[] {
  if (!data) return []
  if (Array.isArray(data)) return data
  return data.items ?? []
}

export function PlatformPricingPage() {
  const { t } = useLocale()
  const { toast } = useToast()
  const { canQuery, canMutate } = usePlatformAccess()
  const p = t.platform.pricing

  const [rules, setRules] = useState<Record<string, unknown>[]>([])
  const [plans, setPlans] = useState<Record<string, unknown>[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [confirmActivate, setConfirmActivate] = useState(false)
  const [simulation, setSimulation] = useState<Record<string, unknown> | null>(null)
  const [scopeType, setScopeType] = useState<PricingScopeType>('Platform')
  const [flatAmount, setFlatAmount] = useState('1000')
  const [flatCurrency, setFlatCurrency] = useState('SYP')
  const [effectiveFrom, setEffectiveFrom] = useState(() => isoDaysAgo(0))
  const [label, setLabel] = useState('')
  const [supersedesRuleId, setSupersedesRuleId] = useState('')
  const [scopeRestaurant, setScopeRestaurant] = useState<PlatformRestaurantLookupDto | null>(null)
  const [scopeOrganization, setScopeOrganization] = useState<PlatformOrganizationLookupDto | null>(
    null,
  )
  const [simRestaurant, setSimRestaurant] = useState<PlatformRestaurantLookupDto | null>(null)
  const [simAmount, setSimAmount] = useState('1200')
  const [simCurrency, setSimCurrency] = useState('SYP')
  const [lookbackDays, setLookbackDays] = useState('30')

  const load = useCallback(
    async (signal?: AbortSignal) => {
      if (!canQuery) {
        setRules([])
        setPlans([])
        setLoading(false)
        setError(null)
        return
      }
      setLoading(true)
      setError(null)
      try {
        const [rulesResult, plansResult] = await Promise.all([
          listPlatformPricingRules({}, signal),
          listPlatformPlans(signal),
        ])
        if (signal?.aborted) return
        setRules(toRows(rulesResult))
        setPlans(toRows(plansResult))
      } catch (err) {
        if (signal?.aborted) return
        setError(isApiError(err) ? err.message : p.errorLoad)
        setRules([])
        setPlans([])
      } finally {
        if (!signal?.aborted) setLoading(false)
      }
    },
    [canQuery, p.errorLoad],
  )

  useEffect(() => {
    const ac = new AbortController()
    void load(ac.signal)
    return () => ac.abort()
  }, [load])

  const runActivate = async (): Promise<void> => {
    const amount = Number(flatAmount)
    if (!label.trim() || !Number.isFinite(amount) || !flatCurrency.trim() || !effectiveFrom) {
      toast('error', p.activateValidation)
      return
    }
    if (scopeType !== 'Platform') {
      const scopeId =
        scopeType === 'Restaurant' ? scopeRestaurant?.id : scopeOrganization?.id
      if (!scopeId) {
        toast('error', p.activateValidation)
        return
      }
    }
    setBusy(true)
    try {
      await activatePlatformPricingRule({
        scopeType,
        feeType: 'Flat',
        flatAmount: amount,
        flatCurrency: flatCurrency.trim(),
        effectiveFrom,
        label: label.trim(),
        ...(scopeType === 'Restaurant'
          ? { scopeId: scopeRestaurant?.id }
          : scopeType === 'Organization'
            ? { scopeId: scopeOrganization?.id }
            : {}),
        ...(supersedesRuleId.trim() ? { supersedesRuleId: supersedesRuleId.trim() } : {}),
      })
      toast('success', p.activateSuccess)
      setConfirmActivate(false)
      setLabel('')
      await load()
    } catch (err) {
      toast('error', isApiError(err) ? err.message : p.activateError)
    } finally {
      setBusy(false)
    }
  }

  const runSimulate = async (): Promise<void> => {
    const amount = Number(simAmount)
    const days = Number(lookbackDays)
    if (!simRestaurant?.id || !Number.isFinite(amount) || !simCurrency.trim()) {
      toast('error', p.simulateValidation)
      return
    }
    setBusy(true)
    try {
      const result = await simulatePlatformPricing({
        restaurantId: simRestaurant.id,
        proposedFlatAmount: amount,
        proposedFlatCurrency: simCurrency.trim(),
        ...(Number.isFinite(days) && days > 0 ? { lookbackDays: days } : {}),
      })
      setSimulation(asRecord(result))
      toast('success', p.simulateSuccess)
    } catch (err) {
      setSimulation(null)
      toast('error', isApiError(err) ? err.message : p.simulateError)
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
        hasRows={rules.length > 0 || plans.length > 0 || simulation !== null}
        error={error}
        onRetry={() => void load()}
        emptyIcon="sell"
        emptyTitle={p.rulesEmptyTitle}
        emptyBody={p.rulesEmptyBody}
        filters={
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <Card className="space-y-4">
              <CardTitle>{p.activateTitle}</CardTitle>
              <p className="text-body-sm text-on-surface-variant">{p.activateHint}</p>
              <Select
                label={p.scopeType}
                value={scopeType}
                onChange={(e) => {
                  setScopeType(e.target.value as PricingScopeType)
                  setScopeRestaurant(null)
                  setScopeOrganization(null)
                }}
                disabled={!canMutate || busy}
              >
                <option value="Platform">{p.scopePlatform}</option>
                <option value="Organization">{p.scopeOrganization}</option>
                <option value="Restaurant">{p.scopeRestaurant}</option>
              </Select>
              {scopeType === 'Restaurant' && (
                <RestaurantPicker
                  selected={scopeRestaurant}
                  onSelect={setScopeRestaurant}
                  disabled={!canMutate || busy}
                  required
                  label={p.scopeId}
                  hint={p.scopeIdHint}
                />
              )}
              {scopeType === 'Organization' && (
                <OrganizationPicker
                  selected={scopeOrganization}
                  onSelect={setScopeOrganization}
                  disabled={!canMutate || busy}
                  required
                  label={p.scopeId}
                  hint={p.scopeIdHint}
                />
              )}
              <Input
                label={p.label}
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                disabled={!canMutate || busy}
              />
              <div className="grid grid-cols-2 gap-3">
                <Input
                  type="number"
                  label={p.feeAmount}
                  value={flatAmount}
                  onChange={(e) => setFlatAmount(e.target.value)}
                  disabled={!canMutate || busy}
                />
                <Input
                  label={p.feeCurrency}
                  value={flatCurrency}
                  onChange={(e) => setFlatCurrency(e.target.value)}
                  disabled={!canMutate || busy}
                />
              </div>
              <Input
                type="date"
                label={p.effectiveFrom}
                value={effectiveFrom}
                onChange={(e) => setEffectiveFrom(e.target.value)}
                disabled={!canMutate || busy}
              />
              <Select
                label={p.supersedesRuleId}
                value={supersedesRuleId}
                onChange={(e) => setSupersedesRuleId(e.target.value)}
                disabled={!canMutate || busy}
              >
                <option value="">—</option>
                {rules.map((raw, index) => {
                  const row = asRecord(raw)
                  const id = String(pickRaw(row, ['id']) ?? index)
                  return (
                    <option key={id} value={id}>
                      {String(pickRaw(row, ['label', 'name']) ?? id)}
                    </option>
                  )
                })}
              </Select>
              <Button disabled={!canMutate} loading={busy} onClick={() => setConfirmActivate(true)}>
                {p.activateSubmit}
              </Button>
            </Card>

            <Card className="space-y-4">
              <CardTitle>{p.simulateTitle}</CardTitle>
              <p className="text-body-sm text-on-surface-variant">{p.simulateHint}</p>
              <RestaurantPicker
                selected={simRestaurant}
                onSelect={setSimRestaurant}
                disabled={busy}
                required
                label={p.simulateRestaurant}
              />
              <div className="grid grid-cols-2 gap-3">
                <Input
                  type="number"
                  label={p.feeAmount}
                  value={simAmount}
                  onChange={(e) => setSimAmount(e.target.value)}
                  disabled={busy}
                />
                <Input
                  label={p.feeCurrency}
                  value={simCurrency}
                  onChange={(e) => setSimCurrency(e.target.value)}
                  disabled={busy}
                />
              </div>
              <Input
                type="number"
                label={p.lookbackDays}
                value={lookbackDays}
                onChange={(e) => setLookbackDays(e.target.value)}
                disabled={busy}
                min={1}
                max={365}
              />
              <Button variant="secondary" loading={busy} onClick={() => void runSimulate()}>
                {p.simulateSubmit}
              </Button>
              {simulation && (
                <div className="space-y-2">
                  <p className="text-overline text-on-surface-variant">{p.simulateResult}</p>
                  <RecordDl record={simulation} />
                </div>
              )}
            </Card>
          </div>
        }
      >
        <div className="space-y-8">
          <section>
            <CardTitle className="mb-4">{p.rulesTitle}</CardTitle>
            {rules.length === 0 ? (
              <Card padding="none">
                <EmptyState icon="sell" title={p.rulesEmptyTitle} description={p.rulesEmptyBody} />
              </Card>
            ) : (
              <DataTable>
                <DataTableHead>
                  <DataTableHeader>{p.colLabel}</DataTableHeader>
                  <DataTableHeader numeric>{p.colFee}</DataTableHeader>
                  <DataTableHeader>{p.colCurrency}</DataTableHeader>
                  <DataTableHeader>{p.colScope}</DataTableHeader>
                  <DataTableHeader>{p.colStatus}</DataTableHeader>
                </DataTableHead>
                <DataTableBody>
                  {rules.map((raw, index) => {
                    const row = asRecord(raw)
                    return (
                      <DataTableRow
                        key={String(pickRaw(row, ['id']) ?? index)}
                        accent={platformRowAccent(String(pickRaw(row, ['status']) ?? ''))}
                      >
                        <DataTableCell className="font-medium">
                          {String(pickRaw(row, ['label', 'name']) ?? '—')}
                        </DataTableCell>
                        <DataTableCell numeric>
                          <Num>{String(pickRaw(row, ['flatAmount', 'amount', 'feeAmount', 'fee']) ?? '—')}</Num>
                        </DataTableCell>
                        <DataTableCell>
                          {String(pickRaw(row, ['flatCurrency', 'currency']) ?? '—')}
                        </DataTableCell>
                        <DataTableCell>
                          {String(pickRaw(row, ['scopeType', 'scope']) ?? '—')}
                        </DataTableCell>
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
          <section>
            <CardTitle className="mb-4">{p.plansTitle}</CardTitle>
            {plans.length === 0 ? (
              <Card padding="none">
                <EmptyState icon="credit_card" title={p.plansEmptyTitle} description={p.plansEmptyBody} />
              </Card>
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
                    return (
                      <DataTableRow key={String(pickRaw(row, ['planId', 'id']) ?? index)}>
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
        open={confirmActivate}
        onClose={() => {
          if (!busy) setConfirmActivate(false)
        }}
        onConfirm={() => {
          void runActivate()
        }}
        title={t.platform.common.confirmTitle}
        message={p.confirmActivate}
        confirmLabel={t.common.confirm}
        cancelLabel={t.common.cancel}
        busy={busy}
        closeOnConfirm={false}
      />
    </>
  )
}
