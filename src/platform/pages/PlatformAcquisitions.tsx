import { useCallback, useEffect, useState } from 'react'
import {
  getPlatformAcquisition,
  listPlatformAcquisitions,
  recordPlatformAcquisitionManual,
  reversePlatformAcquisition,
  type PlatformRestaurantLookupDto,
  type PlatformUserAccountDto,
  accountRecordId,
} from '@/platform/api/platformAdmin'
import { userFacingApiError } from '@/lib/platformErrors'
import { Input, Textarea } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { FilterBar } from '@/components/ui/FilterBar'
import { Card, CardTitle } from '@/components/ui/Card'
import { ConfirmDialog, Modal } from '@/components/ui/Modal'
import {
  DataTable,
  DataTableHead,
  DataTableHeader,
  DataTableBody,
  DataTableRow,
  DataTableCell,
} from '@/components/ui/DataTable'
import { Num } from '@/components/ui/Num'
import { MaterialIcon } from '@/components/ui/Icon'
import { useLocale } from '@/context/LocaleContext'
import { useToast } from '@/context/ToastContext'
import { usePlatformAccess } from '@/platform/auth/usePlatformAccess'
import { AccountPicker, RestaurantPicker } from '@/platform/ui/EntitySearchPicker'
import { formatPlatformDateTime } from '@/platform/ui/dates'
import { PaginationBar } from '@/platform/ui/PaginationBar'
import { PlatformListPage } from '@/platform/ui/PlatformListPage'
import { PlatformStatusBadge } from '@/platform/ui/PlatformStatusBadge'
import { RecordDl } from '@/platform/ui/RecordDl'
import { asRecord, pickRaw } from '@/platform/ui/recordFields'
import { platformRowAccent } from '@/platform/ui/statusTone'

const PAGE_SIZE = 20

export function PlatformAcquisitionsPage() {
  const { t, locale } = useLocale()
  const { toast } = useToast()
  const { canQuery, canMutate } = usePlatformAccess()
  const p = t.platform.acquisitions

  const [selected, setSelected] = useState<PlatformRestaurantLookupDto | null>(null)
  const [items, setItems] = useState<Record<string, unknown>[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searched, setSearched] = useState(false)
  const [lookupId, setLookupId] = useState('')
  const [lookupRecord, setLookupRecord] = useState<Record<string, unknown> | null>(null)
  const [lookupBusy, setLookupBusy] = useState(false)
  const [showTechnical, setShowTechnical] = useState(false)
  const [manualCustomer, setManualCustomer] = useState<PlatformUserAccountDto | null>(null)
  const [manualGuestId, setManualGuestId] = useState('')
  const [manualReason, setManualReason] = useState('')
  const [confirmManual, setConfirmManual] = useState(false)
  const [reverseId, setReverseId] = useState<string | null>(null)
  const [reverseReason, setReverseReason] = useState('')
  const [busy, setBusy] = useState(false)

  const load = useCallback(
    async (signal?: AbortSignal) => {
      if (!canQuery || !selected) {
        setItems([])
        setTotal(0)
        setLoading(false)
        return
      }
      setLoading(true)
      setError(null)
      setSearched(true)
      try {
        const result = await listPlatformAcquisitions(
          { restaurantId: selected.id, page, pageSize: PAGE_SIZE },
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
    [canQuery, selected, page, p.errorLoad, t],
  )

  useEffect(() => {
    if (!selected) return
    const ac = new AbortController()
    void load(ac.signal)
    return () => ac.abort()
  }, [load, selected])

  const runLookup = async (): Promise<void> => {
    const id = lookupId.trim()
    if (!id) return
    setLookupBusy(true)
    try {
      const result = await getPlatformAcquisition(id)
      setLookupRecord(asRecord(result))
    } catch (err) {
      setLookupRecord(null)
      toast('error', userFacingApiError(err, t, p.lookupError))
    } finally {
      setLookupBusy(false)
    }
  }

  const runReverse = async (): Promise<void> => {
    if (!reverseId) return
    if (!reverseReason.trim()) {
      toast('error', p.reverseValidation)
      return
    }
    setBusy(true)
    try {
      await reversePlatformAcquisition(reverseId, { reason: reverseReason.trim() })
      toast('success', p.reverseSuccess)
      setReverseId(null)
      setReverseReason('')
      if (lookupId.trim() === reverseId) await runLookup()
      await load()
    } catch (err) {
      toast('error', userFacingApiError(err, t, p.reverseError))
    } finally {
      setBusy(false)
    }
  }

  const runManual = async (): Promise<void> => {
    const restaurantId = selected?.id
    const userId = accountRecordId(manualCustomer ?? { id: '' })
    const guestId = manualGuestId.trim()
    if (!restaurantId || !manualReason.trim() || Number(Boolean(userId)) + Number(Boolean(guestId)) !== 1) {
      toast('error', p.manualValidation)
      return
    }
    setBusy(true)
    try {
      await recordPlatformAcquisitionManual({
        restaurantId,
        reason: manualReason.trim(),
        ...(userId ? { userId } : { reservationGuestId: guestId }),
      })
      toast('success', p.manualSuccess)
      setConfirmManual(false)
      setManualCustomer(null)
      setManualGuestId('')
      setManualReason('')
      await load()
    } catch (err) {
      toast('error', userFacingApiError(err, t, p.manualError))
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
        hasRows={items.length > 0 || lookupRecord !== null}
        error={error}
        onRetry={() => void load()}
        emptyIcon="campaign"
        emptyTitle={searched ? p.emptyTitle : p.promptTitle}
        emptyBody={searched ? p.emptyBody : p.promptBody}
        filters={
          <div className="space-y-4">
            <FilterBar
              summary={selected ? selected.name ?? selected.slug : undefined}
            >
              <RestaurantPicker
                selected={selected}
                onSelect={(row) => {
                  setSelected(row)
                  setSearched(false)
                  setItems([])
                  setPage(1)
                }}
                disabled={!canQuery}
                label={p.restaurant}
              />
            </FilterBar>

            <FilterBar
              actions={
                <Button type="button" variant="ghost" onClick={() => setShowTechnical((v) => !v)}>
                  {p.technicalLookup}
                </Button>
              }
            >
              {showTechnical ? (
                <div className="min-w-[240px] flex-1">
                  <Input
                    label={p.lookupId}
                    hint={p.lookupEmpty}
                    value={lookupId}
                    onChange={(e) => setLookupId(e.target.value)}
                  />
                </div>
              ) : null}
            </FilterBar>
            {showTechnical && (
              <Button type="button" variant="secondary" loading={lookupBusy} onClick={() => void runLookup()}>
                {p.lookup}
              </Button>
            )}

            {canMutate && (
              <Card className="max-w-xl space-y-4">
                <CardTitle>{p.manualTitle}</CardTitle>
                <p className="text-body-sm text-on-surface-variant">{p.manualSubtitle}</p>
                <AccountPicker
                  selected={manualCustomer}
                  onSelect={(row) => {
                    setManualCustomer(row)
                    if (row) setManualGuestId('')
                  }}
                  disabled={busy || Boolean(manualGuestId.trim())}
                  label={p.manualUserId}
                  accountType="Customer"
                />
                <details className="rounded-lg border border-outline-variant/60 px-3 py-2">
                  <summary className="cursor-pointer text-label-md text-on-surface-variant">
                    {t.platform.common.technicalDetails}
                  </summary>
                  <div className="mt-3">
                    <Input
                      label={p.manualGuestId}
                      value={manualGuestId}
                      onChange={(e) => {
                        setManualGuestId(e.target.value)
                        if (e.target.value.trim()) setManualCustomer(null)
                      }}
                      disabled={busy || Boolean(manualCustomer)}
                    />
                  </div>
                </details>
                <Textarea
                  label={p.manualReason}
                  value={manualReason}
                  onChange={(e) => setManualReason(e.target.value)}
                  disabled={busy}
                  rows={3}
                />
                <Button disabled={!selected} onClick={() => setConfirmManual(true)}>
                  {p.manualSubmit}
                </Button>
              </Card>
            )}
          </div>
        }
      >
        <div className="space-y-8">
          {lookupRecord && (
            <section className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <CardTitle>{p.lookupId}</CardTitle>
                <Button
                  size="sm"
                  variant="danger"
                  disabled={!canMutate || busy}
                  onClick={() => {
                    setReverseId(String(pickRaw(lookupRecord, ['id', 'acquisitionId']) ?? lookupId.trim()))
                    setReverseReason('')
                  }}
                >
                  {p.reverse}
                </Button>
              </div>
              <RecordDl record={lookupRecord} />
            </section>
          )}

          <DataTable>
            <DataTableHead>
              <DataTableHeader>{p.colCreated}</DataTableHeader>
              <DataTableHeader>{p.colStatus}</DataTableHeader>
              <DataTableHeader>{p.colCurrency}</DataTableHeader>
              <DataTableHeader numeric>{p.colAmount}</DataTableHeader>
              <DataTableHeader>{p.colSource}</DataTableHeader>
              <DataTableHeader>{p.colActions}</DataTableHeader>
            </DataTableHead>
            <DataTableBody>
              {items.map((raw, index) => {
                const row = asRecord(raw)
                const id = String(pickRaw(row, ['id', 'acquisitionId']) ?? index)
                const amount = pickRaw(row, ['recordedTotal', 'amount', 'feeAmount', 'total'])
                const status = String(pickRaw(row, ['status']) ?? '')
                return (
                  <DataTableRow key={id} accent={platformRowAccent(status)}>
                    <DataTableCell className="font-medium">
                      {formatPlatformDateTime(
                        String(pickRaw(row, ['createdAt', 'recordedAt', 'timestamp']) ?? ''),
                        locale,
                      )}
                    </DataTableCell>
                    <DataTableCell>
                      <PlatformStatusBadge status={status} />
                    </DataTableCell>
                    <DataTableCell>{String(pickRaw(row, ['currency']) ?? '—')}</DataTableCell>
                    <DataTableCell numeric>
                      <Num>{amount == null ? '—' : String(amount)}</Num>
                    </DataTableCell>
                    <DataTableCell>
                      {String(pickRaw(row, ['createdVia', 'source', 'origin']) ?? '—')}
                    </DataTableCell>
                    <DataTableCell>
                      {status.toLowerCase() !== 'reversed' && (
                        <Button
                          size="sm"
                          variant="danger"
                          disabled={!canMutate || busy}
                          onClick={() => {
                            setReverseId(id)
                            setReverseReason('')
                          }}
                        >
                          <MaterialIcon name="undo" size={14} />
                          {p.reverse}
                        </Button>
                      )}
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
        </div>
      </PlatformListPage>

      <ConfirmDialog
        open={confirmManual}
        onClose={() => {
          if (!busy) setConfirmManual(false)
        }}
        onConfirm={() => {
          void runManual()
        }}
        title={t.platform.common.confirmTitle}
        message={p.confirmManual}
        confirmLabel={t.common.confirm}
        cancelLabel={t.common.cancel}
        busy={busy}
        closeOnConfirm={false}
      />

      <Modal
        open={reverseId !== null}
        onClose={() => {
          if (!busy) setReverseId(null)
        }}
        title={p.reverse}
        description={p.confirmReverse}
        footer={
          <>
            <Button variant="ghost" disabled={busy} onClick={() => setReverseId(null)}>
              {t.common.cancel}
            </Button>
            <Button variant="danger" loading={busy} onClick={() => void runReverse()}>
              {p.reverse}
            </Button>
          </>
        }
      >
        <Textarea
          label={p.reverseReason}
          hint={p.reverseReasonHint}
          value={reverseReason}
          onChange={(e) => setReverseReason(e.target.value)}
          disabled={busy}
          rows={4}
          maxLength={1000}
        />
      </Modal>
    </>
  )
}
