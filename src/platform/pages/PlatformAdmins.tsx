import { useCallback, useEffect, useState } from 'react'
import {
  createPlatformAdmin,
  deactivatePlatformAdmin,
  getPlatformAdmin,
  listPlatformAdmins,
  reactivatePlatformAdmin,
  updatePlatformAdminRole,
  type PlatformAdminAccountDto,
  type PlatformAdminRole,
} from '@/platform/api/platformAdmin'
import { isApiError } from '@/api/errors'
import { Button } from '@/components/ui/Button'
import { FilterBar } from '@/components/ui/FilterBar'
import { Card, CardTitle } from '@/components/ui/Card'
import { ConfirmDialog } from '@/components/ui/Modal'
import { Input, Select } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
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
import { CopyId } from '@/platform/ui/CopyId'
import { PaginationBar } from '@/platform/ui/PaginationBar'
import { PlatformListPage } from '@/platform/ui/PlatformListPage'
import { PlatformStatusBadge } from '@/platform/ui/PlatformStatusBadge'

const PAGE_SIZE = 20

export function PlatformAdminsPage() {
  const { t } = useLocale()
  const { toast } = useToast()
  const { canQuery, canMutate } = usePlatformAccess()
  const p = t.platform.admins

  const [items, setItems] = useState<PlatformAdminAccountDto[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [pending, setPending] = useState<{
    id: string
    action: 'deactivate' | 'reactivate' | 'role'
    role?: PlatformAdminRole
  } | null>(null)
  const [busy, setBusy] = useState(false)
  const [lookupId, setLookupId] = useState('')
  const [lookupBusy, setLookupBusy] = useState(false)
  const [form, setForm] = useState({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    role: 'PlatformSupport' as PlatformAdminRole,
  })

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
        const result = await listPlatformAdmins({ page, pageSize: PAGE_SIZE }, signal)
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
    [canQuery, page, p.errorLoad],
  )

  useEffect(() => {
    const ac = new AbortController()
    void load(ac.signal)
    return () => ac.abort()
  }, [load])

  const runPending = async (): Promise<void> => {
    if (!pending) return
    setBusy(true)
    try {
      if (pending.action === 'deactivate') await deactivatePlatformAdmin(pending.id)
      else if (pending.action === 'reactivate') await reactivatePlatformAdmin(pending.id)
      else if (pending.role) await updatePlatformAdminRole(pending.id, { role: pending.role })
      toast('success', pending.action === 'role' ? p.roleSuccess : p.actionSuccess)
      setPending(null)
      await load()
    } catch (err) {
      toast('error', isApiError(err) ? err.message : pending.action === 'role' ? p.roleError : p.actionError)
    } finally {
      setBusy(false)
    }
  }

  const runLookup = async (): Promise<void> => {
    const id = lookupId.trim()
    if (!id) return
    setLookupBusy(true)
    try {
      const result = await getPlatformAdmin(id)
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

  const handleCreate = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault()
    if (!canMutate) {
      toast('error', p.needAuth)
      return
    }
    if (!form.email.trim() || !form.password || !form.firstName.trim() || !form.lastName.trim()) {
      toast('error', p.createValidation)
      return
    }
    setCreating(true)
    try {
      await createPlatformAdmin({
        email: form.email.trim(),
        password: form.password,
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        role: form.role,
      })
      toast('success', p.createSuccess)
      setForm({
        email: '',
        password: '',
        firstName: '',
        lastName: '',
        role: 'PlatformSupport',
      })
      await load()
    } catch (err) {
      toast('error', isApiError(err) ? err.message : p.createError)
    } finally {
      setCreating(false)
    }
  }

  const roleLabel = (role: string | undefined): string => {
    if (role === 'PlatformAdmin') return t.platform.status.platformAdmin
    if (role === 'PlatformSupport') return t.platform.status.platformSupport
    return role ?? '—'
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
        emptyIcon="admin_panel_settings"
        emptyTitle={p.emptyTitle}
        emptyBody={p.emptyBody}
        filters={
          <div className="space-y-4">
            <FilterBar
              actions={
                <Button type="button" variant="secondary" loading={lookupBusy} onClick={() => void runLookup()}>
                  {p.lookup}
                </Button>
              }
            >
              <div className="min-w-[240px] flex-1">
                <Input
                  label={p.lookupId}
                  value={lookupId}
                  onChange={(e) => setLookupId(e.target.value)}
                />
              </div>
            </FilterBar>
          <Card className="max-w-3xl">
            <CardTitle className="mb-2">{p.createTitle}</CardTitle>
            <p className="mb-4 text-body-sm text-on-surface-variant">
              {canMutate ? p.createSubtitle : p.needAuth}
            </p>
            <form className="grid grid-cols-1 gap-3 sm:grid-cols-2" onSubmit={(e) => void handleCreate(e)}>
              <Input
                label={p.firstName}
                value={form.firstName}
                onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))}
                disabled={!canMutate || creating}
              />
              <Input
                label={p.lastName}
                value={form.lastName}
                onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))}
                disabled={!canMutate || creating}
              />
              <div className="sm:col-span-2">
                <Input
                  type="email"
                  label={p.email}
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  disabled={!canMutate || creating}
                />
              </div>
              <Input
                type="password"
                label={p.password}
                hint={p.passwordHint}
                value={form.password}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                disabled={!canMutate || creating}
                minLength={8}
              />
              <Select
                label={p.role}
                value={form.role}
                onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as PlatformAdminRole }))}
                disabled={!canMutate || creating}
              >
                <option value="PlatformSupport">{t.platform.status.platformSupport}</option>
                <option value="PlatformAdmin">{t.platform.status.platformAdmin}</option>
              </Select>
              <div className="sm:col-span-2">
                <Button type="submit" disabled={!canMutate} loading={creating}>
                  {p.createSubmit}
                </Button>
              </div>
            </form>
          </Card>
          </div>
        }
      >
        <DataTable>
          <DataTableHead>
            <DataTableHeader>{p.colName}</DataTableHeader>
            <DataTableHeader>{p.colEmail}</DataTableHeader>
            <DataTableHeader>{p.colRole}</DataTableHeader>
            <DataTableHeader>{p.colStatus}</DataTableHeader>
            <DataTableHeader>{p.colActions}</DataTableHeader>
          </DataTableHead>
          <DataTableBody>
            {items.map((row) => {
              const status = (row.status ?? '').toLowerCase()
              const isActive = status === 'active' || status === ''
              return (
                <DataTableRow key={row.id}>
                  <DataTableCell className="font-medium">
                    <div className="space-y-1">
                      <div>{[row.firstName, row.lastName].filter(Boolean).join(' ') || '—'}</div>
                      <CopyId value={row.id} copyLabel={t.common.copy} copiedLabel={t.common.copied} />
                    </div>
                  </DataTableCell>
                  <DataTableCell>{row.email ?? '—'}</DataTableCell>
                  <DataTableCell>
                    <Badge tone={row.role === 'PlatformAdmin' ? 'brand' : 'info'} dot>
                      {roleLabel(row.role)}
                    </Badge>
                  </DataTableCell>
                  <DataTableCell>
                    <PlatformStatusBadge status={row.status} />
                  </DataTableCell>
                  <DataTableCell>
                    <div className="flex flex-wrap gap-1">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={!canMutate || busy}
                        onClick={() =>
                          setPending({
                            id: row.id,
                            action: 'role',
                            role: row.role === 'PlatformAdmin' ? 'PlatformSupport' : 'PlatformAdmin',
                          })
                        }
                      >
                        {p.changeRole}
                      </Button>
                    {isActive ? (
                      <Button
                        size="sm"
                        variant="danger"
                        disabled={!canMutate || busy}
                        onClick={() => setPending({ id: row.id, action: 'deactivate' })}
                      >
                        {p.deactivate}
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="secondary"
                        disabled={!canMutate || busy}
                        onClick={() => setPending({ id: row.id, action: 'reactivate' })}
                      >
                        {p.reactivate}
                      </Button>
                    )}
                    </div>
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

      <ConfirmDialog
        open={pending !== null}
        onClose={() => {
          if (!busy) setPending(null)
        }}
        onConfirm={() => {
          void runPending()
        }}
        title={t.platform.common.confirmTitle}
        message={
          pending?.action === 'deactivate'
            ? p.confirmDeactivate
            : pending?.action === 'reactivate'
              ? p.confirmReactivate
              : p.confirmRole
        }
        confirmLabel={t.common.confirm}
        cancelLabel={t.common.cancel}
        variant={pending?.action === 'deactivate' ? 'danger' : 'primary'}
        busy={busy}
        closeOnConfirm={false}
      />
    </>
  )
}
