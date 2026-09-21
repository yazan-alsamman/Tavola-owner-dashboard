import { useCallback, useEffect, useState } from 'react'
import {
  disablePlatformAccountLogin,
  enablePlatformAccountLogin,
  forceLogoutPlatformAccount,
  getPlatformAccount,
  resetPlatformAccountCredentials,
  searchPlatformAccounts,
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
import { CopyId } from '@/platform/ui/CopyId'
import { PaginationBar } from '@/platform/ui/PaginationBar'
import { PlatformListPage } from '@/platform/ui/PlatformListPage'
import { PlatformStatusBadge } from '@/platform/ui/PlatformStatusBadge'
import { RecordDl } from '@/platform/ui/RecordDl'
import { useDebouncedValue } from '@/platform/ui/useDebouncedValue'

const PAGE_SIZE = 20

type AccountAction = 'forceLogout' | 'disable' | 'enable' | 'reset'

export function PlatformAccountsPage() {
  const { t } = useLocale()
  const { toast } = useToast()
  const { canQuery, canMutate } = usePlatformAccess()
  const p = t.platform.accounts
  const c = t.platform.common

  const [inputQ, setInputQ] = useState('')
  const [searchQ, setSearchQ] = useState('')
  const debouncedQ = useDebouncedValue(inputQ, 300)
  const [status, setStatus] = useState('')
  const [accountType, setAccountType] = useState('')
  const [page, setPage] = useState(1)
  const [items, setItems] = useState<PlatformUserAccountDto[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selected, setSelected] = useState<PlatformUserAccountDto | null>(null)
  const [detail, setDetail] = useState<PlatformUserAccountDto | null>(null)
  const [newPassword, setNewPassword] = useState('')
  const [showReset, setShowReset] = useState(false)
  const [busy, setBusy] = useState(false)
  const [pending, setPending] = useState<AccountAction | null>(null)
  const [lookupId, setLookupId] = useState('')
  const [lookupBusy, setLookupBusy] = useState(false)

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
        const result = await searchPlatformAccounts(
          {
            q: searchQ || undefined,
            status: status || undefined,
            accountType: accountType || undefined,
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
    [canQuery, page, searchQ, status, accountType, p.errorLoad],
  )

  useEffect(() => {
    const ac = new AbortController()
    void load(ac.signal)
    return () => ac.abort()
  }, [load])

  const confirmCopy: Record<AccountAction, string> = {
    forceLogout: p.confirmForceLogout,
    disable: p.confirmDisable,
    enable: p.confirmEnable,
    reset: p.confirmReset,
  }

  const runPending = async (): Promise<void> => {
    if (!pending || !selected) return
    if (pending === 'reset' && newPassword.length < 12) {
      toast('error', p.passwordRequired)
      return
    }
    setBusy(true)
    try {
      if (pending === 'forceLogout') await forceLogoutPlatformAccount(selected.id)
      else if (pending === 'disable') await disablePlatformAccountLogin(selected.id)
      else if (pending === 'enable') await enablePlatformAccountLogin(selected.id)
      else await resetPlatformAccountCredentials(selected.id, { newPassword })
      toast('success', p.actionSuccess)
      if (pending === 'reset') {
        setNewPassword('')
        setShowReset(false)
      }
      setPending(null)
      await load()
    } catch (err) {
      toast('error', isApiError(err) ? err.message : p.actionError)
    } finally {
      setBusy(false)
    }
  }

  const runLookup = async (): Promise<void> => {
    const id = lookupId.trim()
    if (!id) return
    setLookupBusy(true)
    try {
      const result = await getPlatformAccount(id)
      setDetail(result)
      setSelected(result)
      setItems((current) => {
        const next = current.filter((row) => row.id !== result.id)
        return [result, ...next]
      })
      setTotal((current) => Math.max(current, 1))
    } catch (err) {
      toast('error', isApiError(err) ? err.message : p.lookupError)
    } finally {
      setLookupBusy(false)
    }
  }

  const displayName = (row: PlatformUserAccountDto): string => {
    const name = [row.firstName, row.lastName].filter(Boolean).join(' ').trim()
    return name || row.email || '—'
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
        emptyIcon="manage_accounts"
        emptyTitle={p.emptyTitle}
        emptyBody={p.emptyBody}
        filters={
          <div className="space-y-4">
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
                    setStatus(e.target.value)
                    setPage(1)
                  }}
                >
                  <option value="">{p.statusAll}</option>
                  <option value="Pending">{p.statusPending}</option>
                  <option value="Active">{t.platform.status.active}</option>
                  <option value="Suspended">{t.platform.status.suspended}</option>
                  <option value="Locked">{p.statusLocked}</option>
                  <option value="Deleted">{t.platform.status.deleted}</option>
                  <option value="Anonymized">{p.statusAnonymized}</option>
                </Select>
              </div>
              <div className="min-w-[180px]">
                <Select
                  label={p.accountTypeFilter}
                  value={accountType}
                  onChange={(e) => {
                    setAccountType(e.target.value)
                    setPage(1)
                  }}
                >
                  <option value="">{p.accountTypeAll}</option>
                  <option value="PlatformAdmin">{p.typePlatformAdmin}</option>
                  <option value="OrganizationMember">{p.typeOrganizationMember}</option>
                  <option value="Employee">{p.typeEmployee}</option>
                  <option value="Customer">{p.typeCustomer}</option>
                </Select>
              </div>
            </FilterBar>

            <FilterBar
              actions={
                <Button
                  type="button"
                  variant="secondary"
                  loading={lookupBusy}
                  onClick={() => void runLookup()}
                >
                  {p.lookup}
                </Button>
              }
            >
              <div className="min-w-[240px] flex-1">
                <Input
                  label={p.lookupId}
                  value={lookupId}
                  onChange={(e) => setLookupId(e.target.value)}
                  placeholder={p.accountHint}
                />
              </div>
            </FilterBar>
          </div>
        }
      >
        <DataTable>
          <DataTableHead>
            <DataTableHeader>{p.colName}</DataTableHeader>
            <DataTableHeader>{p.colEmail}</DataTableHeader>
            <DataTableHeader>{p.colType}</DataTableHeader>
            <DataTableHeader>{p.colStatus}</DataTableHeader>
            <DataTableHeader>{p.colId}</DataTableHeader>
            <DataTableHeader>{p.colActions}</DataTableHeader>
          </DataTableHead>
          <DataTableBody>
            {items.map((row) => (
              <DataTableRow key={row.id}>
                <DataTableCell className="font-medium">{displayName(row)}</DataTableCell>
                <DataTableCell>{row.email ?? '—'}</DataTableCell>
                <DataTableCell>{row.accountType ?? '—'}</DataTableCell>
                <DataTableCell>
                  <PlatformStatusBadge status={row.status} deletedAt={row.deletedAt} />
                </DataTableCell>
                <DataTableCell>
                  <CopyId value={row.id} copyLabel={t.common.copy} copiedLabel={t.common.copied} />
                </DataTableCell>
                <DataTableCell>
                  <div className="flex flex-wrap gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setDetail(row)
                        setSelected(row)
                      }}
                    >
                      {p.view}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={!canMutate || busy}
                      onClick={() => {
                        setSelected(row)
                        setPending('forceLogout')
                      }}
                    >
                      {p.forceLogout}
                    </Button>
                    <Button
                      size="sm"
                      variant="danger"
                      disabled={!canMutate || busy}
                      onClick={() => {
                        setSelected(row)
                        setPending('disable')
                      }}
                    >
                      {p.disable}
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={!canMutate || busy}
                      onClick={() => {
                        setSelected(row)
                        setPending('enable')
                      }}
                    >
                      {p.enable}
                    </Button>
                    <Button
                      size="sm"
                      variant="primary"
                      disabled={!canMutate || busy}
                      onClick={() => {
                        setSelected(row)
                        setShowReset(true)
                        setNewPassword('')
                      }}
                    >
                      {p.showReset}
                    </Button>
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

      <Modal
        open={detail !== null}
        onClose={() => setDetail(null)}
        title={p.detailTitle}
        size="lg"
      >
        {detail ? <RecordDl record={detail as Record<string, unknown>} /> : null}
      </Modal>

      <Modal
        open={showReset && selected !== null}
        onClose={() => {
          if (!busy) {
            setShowReset(false)
            setNewPassword('')
          }
        }}
        title={p.reset}
        description={p.passwordHint}
        footer={
          <>
            <Button
              variant="ghost"
              disabled={busy}
              onClick={() => {
                setShowReset(false)
                setNewPassword('')
              }}
            >
              {t.common.cancel}
            </Button>
            <Button
              variant="danger"
              disabled={busy}
              onClick={() => setPending('reset')}
            >
              {p.reset}
            </Button>
          </>
        }
      >
        <Input
          type="password"
          label={p.newPassword}
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          minLength={12}
          disabled={!canMutate || busy}
        />
      </Modal>

      <ConfirmDialog
        open={pending !== null}
        onClose={() => {
          if (!busy) setPending(null)
        }}
        onConfirm={() => {
          void runPending()
        }}
        title={c.confirmTitle}
        message={pending ? confirmCopy[pending] : ''}
        confirmLabel={t.common.confirm}
        cancelLabel={t.common.cancel}
        variant={pending === 'disable' || pending === 'reset' ? 'danger' : 'primary'}
        busy={busy}
        closeOnConfirm={false}
      />
    </>
  )
}
