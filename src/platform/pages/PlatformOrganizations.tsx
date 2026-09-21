import { useCallback, useEffect, useState } from 'react'
import {
  deletePlatformOrganization,
  getPlatformOrganization,
  reactivatePlatformOrganization,
  restorePlatformOrganization,
  searchPlatformOrganizations,
  suspendPlatformOrganization,
  transferPlatformOrganizationOwnership,
  type PlatformOrganizationLookupDto,
  type PlatformOrganizationStatus,
  type PlatformUserAccountDto,
} from '@/platform/api/platformAdmin'
import { isApiError } from '@/api/errors'
import { Input, Select } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { FilterBar } from '@/components/ui/FilterBar'
import { ConfirmDialog, Modal } from '@/components/ui/Modal'
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
import { EntityName } from '@/platform/ui/EntityName'
import { AccountPicker } from '@/platform/ui/EntitySearchPicker'
import { PaginationBar } from '@/platform/ui/PaginationBar'
import { PlatformListPage } from '@/platform/ui/PlatformListPage'
import { PlatformStatusBadge } from '@/platform/ui/PlatformStatusBadge'
import { RecordDl } from '@/platform/ui/RecordDl'
import {
  lifecycleActionIcon,
  lifecycleActionsFor,
  platformRowAccent,
  type LifecycleAction,
} from '@/platform/ui/statusTone'
import { useDebouncedValue } from '@/platform/ui/useDebouncedValue'

const PAGE_SIZE = 20

export function PlatformOrganizationsPage() {
  const { t } = useLocale()
  const { toast } = useToast()
  const { canQuery, canMutate } = usePlatformAccess()
  const p = t.platform.organizations
  const c = t.platform.common

  const [inputQ, setInputQ] = useState('')
  const [searchQ, setSearchQ] = useState('')
  const debouncedQ = useDebouncedValue(inputQ, 300)
  const [status, setStatus] = useState<PlatformOrganizationStatus | ''>('')
  const [page, setPage] = useState(1)
  const [items, setItems] = useState<PlatformOrganizationLookupDto[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState<{ id: string; action: LifecycleAction } | null>(null)
  const [transferId, setTransferId] = useState<string | null>(null)
  const [newOwner, setNewOwner] = useState<PlatformUserAccountDto | null>(null)
  const [busy, setBusy] = useState(false)
  const [detail, setDetail] = useState<PlatformOrganizationLookupDto | null>(null)
  const [detailBusy, setDetailBusy] = useState(false)

  useEffect(() => {
    setSearchQ(debouncedQ.trim())
    setPage(1)
  }, [debouncedQ])

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
        const result = await searchPlatformOrganizations(
          {
            q: searchQ || undefined,
            status: status || undefined,
            page,
            pageSize: PAGE_SIZE,
          },
          signal,
        )
        if (!signal?.aborted) {
          setItems(result.items ?? [])
          setTotal(result.total ?? 0)
        }
      } catch (err) {
        if (signal?.aborted) return
        setError(isApiError(err) ? err.message : p.errorLoad)
        setItems([])
        setTotal(0)
      } finally {
        if (!signal?.aborted) setLoading(false)
      }
    },
    [canQuery, page, searchQ, status, p.errorLoad],
  )

  useEffect(() => {
    const ac = new AbortController()
    void load(ac.signal)
    return () => ac.abort()
  }, [load])

  const confirmCopy: Record<LifecycleAction, string> = {
    suspend: p.confirmSuspend,
    reactivate: p.confirmReactivate,
    delete: p.confirmDelete,
    restore: p.confirmRestore,
  }

  const runPending = async (): Promise<void> => {
    if (!pending) return
    setBusy(true)
    try {
      if (pending.action === 'suspend') await suspendPlatformOrganization(pending.id)
      else if (pending.action === 'reactivate') await reactivatePlatformOrganization(pending.id)
      else if (pending.action === 'delete') await deletePlatformOrganization(pending.id)
      else await restorePlatformOrganization(pending.id)
      toast('success', p.actionSuccess)
      setPending(null)
      await load()
    } catch (err) {
      toast('error', isApiError(err) ? err.message : p.actionError)
    } finally {
      setBusy(false)
    }
  }

  const openDetail = async (id: string): Promise<void> => {
    setDetailBusy(true)
    try {
      const result = await getPlatformOrganization(id)
      setDetail(result)
    } catch (err) {
      toast('error', isApiError(err) ? err.message : p.detailError)
    } finally {
      setDetailBusy(false)
    }
  }

  return (
    <>
      <PlatformListPage
        title={p.title}
        subtitle={p.subtitle}
        canQuery={canQuery}
        loading={loading}
        hasRows={items.length > 0}
        error={error}
        onRetry={() => void load()}
        emptyIcon="corporate_fare"
        emptyTitle={p.emptyTitle}
        emptyBody={p.emptyBody}
        filters={
          <FilterBar
            actions={
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setSearchQ(inputQ.trim())
                  setPage(1)
                }}
              >
                {c.searchButton}
              </Button>
            }
          >
            <div className="min-w-[200px] flex-1">
              <Input
                label={c.search}
                value={inputQ}
                onChange={(e) => setInputQ(e.target.value)}
                placeholder={p.searchPlaceholder}
                icon={<MaterialIcon name="search" size={18} />}
              />
            </div>
            <div className="min-w-[160px]">
              <Select
                label={p.statusFilter}
                value={status}
                onChange={(e) => {
                  setStatus(e.target.value as PlatformOrganizationStatus | '')
                  setPage(1)
                }}
              >
                <option value="">{p.statusAll}</option>
                <option value="Active">{t.platform.status.active}</option>
                <option value="Suspended">{t.platform.status.suspended}</option>
                <option value="Deleted">{t.platform.status.deleted}</option>
              </Select>
            </div>
          </FilterBar>
        }
      >
        <DataTable>
          <DataTableHead>
            <DataTableHeader>{p.colName}</DataTableHeader>
            <DataTableHeader>{p.colSlug}</DataTableHeader>
            <DataTableHeader>{p.colStatus}</DataTableHeader>
            <DataTableHeader>{p.colActions}</DataTableHeader>
          </DataTableHead>
          <DataTableBody>
            {items.map((row) => (
              <DataTableRow key={row.id} accent={platformRowAccent(row.status, row.deletedAt)}>
                <DataTableCell>
                  <EntityName
                    name={row.name ?? '—'}
                    secondary={row.slug}
                    icon="corporate_fare"
                    status={row.status}
                  />
                </DataTableCell>
                <DataTableCell>{row.slug ?? '—'}</DataTableCell>
                <DataTableCell>
                  <PlatformStatusBadge status={row.status} deletedAt={row.deletedAt} />
                </DataTableCell>
                <DataTableCell>
                  <div className="flex flex-wrap gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={detailBusy}
                      onClick={() => void openDetail(row.id)}
                    >
                      <MaterialIcon name="visibility" size={14} />
                      {p.view}
                    </Button>
                    {lifecycleActionsFor(row.status, row.deletedAt).map((action) => (
                      <Button
                        key={action}
                        size="sm"
                        variant={action === 'delete' ? 'danger' : 'outline'}
                        disabled={!canMutate || busy}
                        onClick={() => setPending({ id: row.id, action })}
                      >
                        <MaterialIcon name={lifecycleActionIcon[action]} size={14} />
                        {p[action]}
                      </Button>
                    ))}
                    {!row.deletedAt && (
                      <Button
                        size="sm"
                        variant="secondary"
                        disabled={!canMutate || busy}
                        onClick={() => {
                          setTransferId(row.id)
                          setNewOwner(null)
                        }}
                      >
                        <MaterialIcon name="how_to_reg" size={14} />
                        {p.transfer}
                      </Button>
                    )}
                  </div>
                </DataTableCell>
              </DataTableRow>
            ))}
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

      <ConfirmDialog
        open={pending !== null}
        onClose={() => {
          if (!busy) setPending(null)
        }}
        onConfirm={() => {
          void runPending()
        }}
        title={c.confirmTitle}
        message={pending ? confirmCopy[pending.action] : ''}
        confirmLabel={t.common.confirm}
        cancelLabel={t.common.cancel}
        variant={pending?.action === 'delete' ? 'danger' : 'primary'}
        busy={busy}
        closeOnConfirm={false}
      />

      <Modal
        open={transferId !== null}
        onClose={() => {
          if (!busy) setTransferId(null)
        }}
        title={p.transferTitle}
        description={p.transferHint}
        footer={
          <>
            <Button variant="ghost" disabled={busy} onClick={() => setTransferId(null)}>
              {t.common.cancel}
            </Button>
            <Button
              loading={busy}
              onClick={() => {
                void (async () => {
                  if (!transferId) return
                  if (!newOwner?.id) {
                    toast('error', p.transferValidation)
                    return
                  }
                  setBusy(true)
                  try {
                    await transferPlatformOrganizationOwnership(transferId, {
                      newOwnerUserId: newOwner.id,
                    })
                    toast('success', p.transferSuccess)
                    setTransferId(null)
                    await load()
                  } catch (err) {
                    toast('error', isApiError(err) ? err.message : p.transferError)
                  } finally {
                    setBusy(false)
                  }
                })()
              }}
            >
              {p.transfer}
            </Button>
          </>
        }
      >
        <AccountPicker
          selected={newOwner}
          onSelect={setNewOwner}
          disabled={busy}
          required
          label={p.newOwner}
          hint={p.newOwnerHint}
        />
      </Modal>

      <Modal
        open={detail !== null}
        onClose={() => setDetail(null)}
        title={p.detailTitle}
        size="lg"
      >
        {detail ? <RecordDl record={detail as Record<string, unknown>} /> : null}
      </Modal>
    </>
  )
}
