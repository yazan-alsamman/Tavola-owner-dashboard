import { useCallback, useEffect, useState } from 'react'
import {
  createPlatformAdmin,
  deactivatePlatformAdmin,
  listPlatformAdmins,
  reactivatePlatformAdmin,
  updatePlatformAdminRole,
  type PlatformAdminAccountDto,
  type PlatformAdminRole,
} from '@/platform/api/platformAdmin'
import { userFacingApiError } from '@/lib/platformErrors'
import { generateSecurePassword } from '@/lib/platformCredentials'
import { Button } from '@/components/ui/Button'
import { Card, CardTitle } from '@/components/ui/Card'
import { ConfirmDialog, Modal } from '@/components/ui/Modal'
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
import { ActionMenu } from '@/platform/ui/ActionMenu'
import { GeneratedSecretField } from '@/platform/ui/GeneratedSecretField'
import { PaginationBar } from '@/platform/ui/PaginationBar'
import { PlatformListPage } from '@/platform/ui/PlatformListPage'
import { PlatformStatusBadge } from '@/platform/ui/PlatformStatusBadge'
import { RecordDl } from '@/platform/ui/RecordDl'

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
  const [detail, setDetail] = useState<PlatformAdminAccountDto | null>(null)
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
        setError(userFacingApiError(err, t, p.errorLoad))
        setItems([])
        setTotal(0)
      } finally {
        if (!signal?.aborted) setLoading(false)
      }
    },
    [canQuery, page, p.errorLoad, t],
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
      toast('error', userFacingApiError(err, t, pending.action === 'role' ? p.roleError : p.actionError))
    } finally {
      setBusy(false)
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
      toast('error', userFacingApiError(err, t, p.createError))
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
              <div className="sm:col-span-2">
                <GeneratedSecretField
                  label={p.password}
                  hint={p.passwordHint}
                  value={form.password}
                  disabled={!canMutate || creating}
                  generateLabel={t.platform.common.generatePassword}
                  regenerateLabel={t.platform.common.regenerate}
                  copyLabel={t.common.copy}
                  copiedLabel={t.common.copied}
                  onChange={(value) => setForm((f) => ({ ...f, password: value }))}
                  onGenerate={() => setForm((f) => ({ ...f, password: generateSecurePassword() }))}
                />
              </div>
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
              const adminId = row.id || row.platformAdminId || ''
              const status = (row.status ?? '').toLowerCase()
              const isActive = status === 'active' || status === ''
              return (
                <DataTableRow key={adminId || row.email}>
                  <DataTableCell className="font-medium">
                    {[row.firstName, row.lastName].filter(Boolean).join(' ') || row.email || '—'}
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
                    <ActionMenu
                      label={t.platform.common.actions}
                      disabled={busy}
                      items={[
                        {
                          id: 'view',
                          label: t.platform.accounts.view,
                          icon: 'visibility',
                          onClick: () => setDetail(row),
                        },
                        {
                          id: 'role',
                          label: p.changeRole,
                          disabled: !canMutate,
                          onClick: () =>
                            setPending({
                              id: adminId,
                              action: 'role',
                              role: row.role === 'PlatformAdmin' ? 'PlatformSupport' : 'PlatformAdmin',
                            }),
                        },
                        isActive
                          ? {
                              id: 'deactivate',
                              label: p.deactivate,
                              danger: true,
                              disabled: !canMutate,
                              onClick: () => setPending({ id: adminId, action: 'deactivate' }),
                            }
                          : {
                              id: 'reactivate',
                              label: p.reactivate,
                              disabled: !canMutate,
                              onClick: () => setPending({ id: adminId, action: 'reactivate' }),
                            },
                      ]}
                    />
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

      <Modal open={detail !== null} onClose={() => setDetail(null)} title={p.title} size="lg">
        {detail ? <RecordDl record={detail as Record<string, unknown>} /> : null}
      </Modal>
    </>
  )
}
