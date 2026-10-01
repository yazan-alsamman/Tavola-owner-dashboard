import { useCallback, useEffect, useState } from 'react'
import {
  broadcastPlatformNotification,
  listPlatformNotifications,
  sendPlatformNotification,
  accountRecordId,
  type PlatformNotificationBroadcastDto,
  type PlatformUserAccountDto,
} from '@/platform/api/platformAdmin'
import { userFacingApiError } from '@/lib/platformErrors'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card, CardTitle } from '@/components/ui/Card'
import { Input, Select, Textarea } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
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
import { useNavigate } from 'react-router-dom'
import { AccountPicker } from '@/platform/ui/EntitySearchPicker'
import { PaginationBar } from '@/platform/ui/PaginationBar'
import { PlatformStatusBadge } from '@/platform/ui/PlatformStatusBadge'
import { formatPlatformDateTime } from '@/platform/ui/dates'
import { platformRowAccent } from '@/platform/ui/statusTone'

const PAGE_SIZE = 20

export function PlatformNotificationsPage() {
  const { t, locale } = useLocale()
  const { toast } = useToast()
  const navigate = useNavigate()
  const { canQuery, canMutate } = usePlatformAccess()
  const p = t.platform.notifications

  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [oneTitle, setOneTitle] = useState('')
  const [oneBody, setOneBody] = useState('')
  const [targetUser, setTargetUser] = useState<PlatformUserAccountDto | null>(null)
  const [confirmOne, setConfirmOne] = useState(false)

  const [historyStatus, setHistoryStatus] = useState('')
  const [senderType, setSenderType] = useState('')
  const [page, setPage] = useState(1)
  const [items, setItems] = useState<PlatformNotificationBroadcastDto[]>([])
  const [total, setTotal] = useState(0)
  const [historyLoading, setHistoryLoading] = useState(true)
  const [historyError, setHistoryError] = useState<string | null>(null)

  const loadHistory = useCallback(
    async (signal?: AbortSignal) => {
      if (!canQuery) {
        setItems([])
        setTotal(0)
        setHistoryLoading(false)
        setHistoryError(null)
        return
      }
      setHistoryLoading(true)
      setHistoryError(null)
      try {
        const result = await listPlatformNotifications(
          {
            status: historyStatus || undefined,
            senderType: senderType || undefined,
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
        setHistoryError(userFacingApiError(err, t, p.historyError))
        setItems([])
        setTotal(0)
      } finally {
        if (!signal?.aborted) setHistoryLoading(false)
      }
    },
    [canQuery, historyStatus, senderType, page, p.historyError, t],
  )

  useEffect(() => {
    const ac = new AbortController()
    void loadHistory(ac.signal)
    return () => ac.abort()
  }, [loadHistory])

  const targetUserId = accountRecordId(targetUser ?? { id: '' })

  const send = async (): Promise<void> => {
    const nextTitle = title.trim()
    const nextBody = body.trim()
    if (!nextTitle || !nextBody) {
      toast('error', p.broadcastValidation)
      setConfirmOpen(false)
      return
    }
    setSubmitting(true)
    try {
      const result = await broadcastPlatformNotification({
        title: nextTitle,
        body: nextBody,
      })
      toast('success', p.successTitle, p.successBody.replace('{count}', String(result.totalRecipients)))
      setTitle('')
      setBody('')
      setConfirmOpen(false)
      await loadHistory()
    } catch (err) {
      toast('error', userFacingApiError(err, t, p.errorSend))
    } finally {
      setSubmitting(false)
    }
  }

  const sendOne = async (): Promise<void> => {
    const nextTitle = oneTitle.trim()
    const nextBody = oneBody.trim()
    if (!targetUserId || !nextTitle || !nextBody) {
      toast('error', p.sendOneValidation)
      setConfirmOne(false)
      return
    }
    setSubmitting(true)
    try {
      await sendPlatformNotification({
        targetUserId,
        title: nextTitle,
        body: nextBody,
      })
      toast('success', p.sendOneSuccess)
      setTargetUser(null)
      setOneTitle('')
      setOneBody('')
      setConfirmOne(false)
      await loadHistory()
    } catch (err) {
      toast('error', userFacingApiError(err, t, p.sendOneError))
    } finally {
      setSubmitting(false)
    }
  }

  if (!canQuery) {
    return (
      <div className="space-y-6">
        <PageHeader className="mb-0" title={p.title} subtitle={p.subtitle} icon="notifications" />
        <Card padding="none">
          <EmptyState
            icon="lock"
            title={t.platform.common.needAuthTitle}
            description={t.platform.common.needAuthBody}
            action={
              <Button onClick={() => navigate('/platform/login')}>{t.platform.preview.signIn}</Button>
            }
          />
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader className="mb-0" title={p.title} subtitle={p.subtitle} icon="notifications" />

      <div className="grid max-w-4xl grid-cols-1 gap-4 xl:grid-cols-2">
        <Card className="space-y-4">
          <p className="text-body-sm text-on-surface-variant">{p.riskHint}</p>
          <form
            onSubmit={(e) => {
              e.preventDefault()
              if (!title.trim() || !body.trim()) {
                toast('error', p.broadcastValidation)
                return
              }
              setConfirmOpen(true)
            }}
            className="space-y-4"
          >
            <Input
              label={p.fieldTitle}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              disabled={!canMutate || submitting}
            />
            <Textarea
              label={p.fieldBody}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              required
              disabled={!canMutate || submitting}
              rows={5}
            />
            <Button type="submit" disabled={!canMutate} loading={submitting}>
              <MaterialIcon name="campaign" size={16} />
              {p.send}
            </Button>
          </form>
        </Card>

        <Card className="space-y-4">
          <CardTitle>{p.sendOneTitle}</CardTitle>
          <p className="text-body-sm text-on-surface-variant">{p.sendOneHint}</p>
          <form
            onSubmit={(e) => {
              e.preventDefault()
              if (!targetUserId || !oneTitle.trim() || !oneBody.trim()) {
                toast('error', p.sendOneValidation)
                return
              }
              setConfirmOne(true)
            }}
            className="space-y-4"
          >
            <AccountPicker
              selected={targetUser}
              onSelect={setTargetUser}
              required
              disabled={!canMutate || submitting}
              label={p.targetUser}
              hint={p.sendOneHint}
              accountType="Customer"
            />
            <Input
              label={p.fieldTitle}
              value={oneTitle}
              onChange={(e) => setOneTitle(e.target.value)}
              required
              disabled={!canMutate || submitting}
            />
            <Textarea
              label={p.fieldBody}
              value={oneBody}
              onChange={(e) => setOneBody(e.target.value)}
              required
              disabled={!canMutate || submitting}
              rows={5}
            />
            <Button type="submit" disabled={!canMutate || !targetUserId} loading={submitting}>
              <MaterialIcon name="send" size={16} />
              {p.sendOne}
            </Button>
          </form>
        </Card>
      </div>

      <Card className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <CardTitle>{p.historyTitle}</CardTitle>
          <div className="flex flex-wrap gap-3">
            <div className="min-w-[150px]">
              <Select
                label={p.historyStatus}
                value={historyStatus}
                onChange={(e) => {
                  setHistoryStatus(e.target.value)
                  setPage(1)
                }}
              >
                <option value="">{p.historyStatusAll}</option>
                <option value="Pending">{p.historyPending}</option>
                <option value="Processing">{p.historyProcessing}</option>
                <option value="Completed">{p.historyCompleted}</option>
                <option value="Failed">{p.historyFailed}</option>
              </Select>
            </div>
            <div className="min-w-[170px]">
              <Select
                label={p.historySender}
                value={senderType}
                onChange={(e) => {
                  setSenderType(e.target.value)
                  setPage(1)
                }}
              >
                <option value="">{p.historySenderAll}</option>
                <option value="PlatformAdmin">{p.historySenderPlatform}</option>
                <option value="OrganizationMember">{p.historySenderOrg}</option>
              </Select>
            </div>
          </div>
        </div>

        {historyError ? (
          <EmptyState
            icon="error"
            title={p.historyError}
            description={historyError}
            action={
              <Button variant="secondary" onClick={() => void loadHistory()}>
                {t.common.retry}
              </Button>
            }
          />
        ) : historyLoading ? (
          <p className="text-body-sm text-on-surface-variant">{t.common.loading}</p>
        ) : items.length === 0 ? (
          <EmptyState icon="notifications" title={p.historyEmptyTitle} description={p.historyEmptyBody} />
        ) : (
          <>
            <DataTable>
              <DataTableHead>
                <DataTableHeader>{p.colTitle}</DataTableHeader>
                <DataTableHeader>{p.colStatus}</DataTableHeader>
                <DataTableHeader>{p.colSender}</DataTableHeader>
                <DataTableHeader>{p.colRecipients}</DataTableHeader>
                <DataTableHeader>{p.colCreated}</DataTableHeader>
              </DataTableHead>
              <DataTableBody>
                {items.map((row) => (
                  <DataTableRow key={row.id} accent={platformRowAccent(row.status)}>
                    <DataTableCell className="font-medium">{row.title ?? '—'}</DataTableCell>
                    <DataTableCell>
                      <PlatformStatusBadge status={row.status} />
                    </DataTableCell>
                    <DataTableCell>{row.senderType ?? '—'}</DataTableCell>
                    <DataTableCell>{row.totalRecipients ?? '—'}</DataTableCell>
                    <DataTableCell>
                      {row.createdAt ? formatPlatformDateTime(row.createdAt, locale) : '—'}
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
          </>
        )}
      </Card>

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => {
          if (!submitting) setConfirmOpen(false)
        }}
        onConfirm={() => {
          void send()
        }}
        title={p.confirmTitle}
        message={p.confirmBody}
        confirmLabel={t.common.confirm}
        cancelLabel={t.common.cancel}
        variant="danger"
        busy={submitting}
        closeOnConfirm={false}
      />

      <ConfirmDialog
        open={confirmOne}
        onClose={() => {
          if (!submitting) setConfirmOne(false)
        }}
        onConfirm={() => {
          void sendOne()
        }}
        title={p.sendOneTitle}
        message={p.confirmSendOne}
        confirmLabel={t.common.confirm}
        cancelLabel={t.common.cancel}
        busy={submitting}
        closeOnConfirm={false}
      />
    </div>
  )
}
