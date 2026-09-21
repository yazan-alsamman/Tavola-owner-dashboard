import { useCallback, useEffect, useState } from 'react'
import {
  createPlatformRestaurant,
  deletePlatformRestaurant,
  getPlatformRestaurant,
  provisionRestaurantOwner,
  reactivatePlatformRestaurant,
  restorePlatformRestaurant,
  searchPlatformOrganizations,
  searchPlatformRestaurants,
  suspendPlatformRestaurant,
  type PlatformOrganizationLookupDto,
  type PlatformRestaurantLookupDto,
  type PlatformRestaurantStatus,
} from '@/platform/api/platformAdmin'
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
import { generateSecurePassword, slugFromName } from '@/lib/platformCredentials'
import { userFacingApiError } from '@/lib/platformErrors'
import { usePlatformAccess } from '@/platform/auth/usePlatformAccess'
import { ActionMenu } from '@/platform/ui/ActionMenu'
import { EntityName } from '@/platform/ui/EntityName'
import { OrganizationPicker, organizationNameFromRestaurant } from '@/platform/ui/EntitySearchPicker'
import { GeneratedSecretField } from '@/platform/ui/GeneratedSecretField'
import { PaginationBar } from '@/platform/ui/PaginationBar'
import { PlatformListPage } from '@/platform/ui/PlatformListPage'
import { PlatformStatusBadge } from '@/platform/ui/PlatformStatusBadge'
import { RecordDl } from '@/platform/ui/RecordDl'
import { lifecycleActionsFor, platformRowAccent, type LifecycleAction } from '@/platform/ui/statusTone'
import { useDebouncedValue } from '@/platform/ui/useDebouncedValue'

const PAGE_SIZE = 20

const emptyCreateForm = {
  name: '',
  slug: '',
  description: '',
  cuisineType: '',
  priceLevel: '',
}

type CreateStep = 'restaurant' | 'organization' | 'owner' | 'review'

export function PlatformRestaurantsPage() {
  const { t } = useLocale()
  const { toast } = useToast()
  const { canQuery, canMutate } = usePlatformAccess()
  const p = t.platform.restaurants
  const c = t.platform.common
  const prov = t.platform.provision

  const [inputQ, setInputQ] = useState('')
  const [searchQ, setSearchQ] = useState('')
  const debouncedQ = useDebouncedValue(inputQ, 300)
  const [status, setStatus] = useState<PlatformRestaurantStatus | ''>('')
  const [page, setPage] = useState(1)
  const [items, setItems] = useState<PlatformRestaurantLookupDto[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState<{ id: string; action: LifecycleAction } | null>(null)
  const [busy, setBusy] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [createForm, setCreateForm] = useState(emptyCreateForm)
  const [slugTouched, setSlugTouched] = useState(false)
  const [createOrg, setCreateOrg] = useState<PlatformOrganizationLookupDto | null>(null)
  const [orgMode, setOrgMode] = useState<'existing' | 'new'>('existing')
  const [step, setStep] = useState<CreateStep>('restaurant')
  const [owner, setOwner] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    organizationName: '',
  })
  const [detail, setDetail] = useState<PlatformRestaurantLookupDto | null>(null)
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
        const result = await searchPlatformRestaurants(
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
        setError(userFacingApiError(err, t, p.errorLoad))
        setItems([])
        setTotal(0)
      } finally {
        if (!signal?.aborted) setLoading(false)
      }
    },
    [canQuery, page, searchQ, status, p.errorLoad, t],
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

  const resetCreate = (): void => {
    setCreateForm(emptyCreateForm)
    setSlugTouched(false)
    setCreateOrg(null)
    setOrgMode('existing')
    setStep('restaurant')
    setOwner({ firstName: '', lastName: '', email: '', password: '', organizationName: '' })
  }

  const runPending = async (): Promise<void> => {
    if (!pending) return
    setBusy(true)
    try {
      if (pending.action === 'suspend') await suspendPlatformRestaurant(pending.id)
      else if (pending.action === 'reactivate') await reactivatePlatformRestaurant(pending.id)
      else if (pending.action === 'delete') await deletePlatformRestaurant(pending.id)
      else await restorePlatformRestaurant(pending.id)
      toast('success', p.actionSuccess)
      const id = pending.id
      setPending(null)
      await load()
      if (detail?.id === id) {
        const refreshed = await getPlatformRestaurant(id)
        setDetail(refreshed)
      }
    } catch (err) {
      toast('error', userFacingApiError(err, t, p.actionError))
    } finally {
      setBusy(false)
    }
  }

  const openDetail = async (id: string): Promise<void> => {
    setDetailBusy(true)
    try {
      const result = await getPlatformRestaurant(id)
      setDetail(result)
    } catch (err) {
      toast('error', userFacingApiError(err, t, p.detailError))
    } finally {
      setDetailBusy(false)
    }
  }

  const canAdvanceRestaurant = Boolean(createForm.name.trim() && createForm.slug.trim())
  const canAdvanceOrg = orgMode === 'new' || Boolean(createOrg?.id)
  const canAdvanceOwner =
    Boolean(
      owner.firstName.trim() &&
        owner.lastName.trim() &&
        owner.email.trim() &&
        owner.password.length >= 8 &&
        owner.organizationName.trim(),
    )

  const goNext = (): void => {
    if (step === 'restaurant' && canAdvanceRestaurant) setStep('organization')
    else if (step === 'organization' && canAdvanceOrg) {
      if (orgMode === 'new') {
        setOwner((current) => ({
          ...current,
          organizationName: current.organizationName.trim() || createForm.name.trim(),
        }))
        setStep('owner')
      } else {
        setStep('review')
      }
    } else if (step === 'owner' && canAdvanceOwner) setStep('review')
  }

  const goBack = (): void => {
    if (step === 'review') setStep(orgMode === 'new' ? 'owner' : 'organization')
    else if (step === 'owner') setStep('organization')
    else if (step === 'organization') setStep('restaurant')
  }

  const handleCreate = async (): Promise<void> => {
    if (!canMutate) return
    const name = createForm.name.trim()
    const slug = createForm.slug.trim()
    if (!name || !slug) {
      toast('error', p.createValidation)
      return
    }
    const priceRaw = createForm.priceLevel.trim()
    let priceLevel: number | undefined
    if (priceRaw) {
      priceLevel = Number(priceRaw)
      if (!Number.isInteger(priceLevel) || priceLevel < 1 || priceLevel > 4) {
        toast('error', p.createPriceLevelHint)
        return
      }
    }

    setCreating(true)
    try {
      let organizationId = createOrg?.id ?? ''
      if (orgMode === 'new') {
        if (!canAdvanceOwner) {
          toast('error', p.createValidation)
          setCreating(false)
          return
        }
        await provisionRestaurantOwner({
          email: owner.email.trim(),
          password: owner.password,
          firstName: owner.firstName.trim(),
          lastName: owner.lastName.trim(),
          organizationName: owner.organizationName.trim(),
          consents: { termsOfService: true, privacyPolicy: true, marketing: false },
        })
        const lookup = await searchPlatformOrganizations({
          q: owner.organizationName.trim(),
          page: 1,
          pageSize: 8,
        })
        const match =
          lookup.items?.find(
            (row) => row.name?.trim().toLowerCase() === owner.organizationName.trim().toLowerCase(),
          ) ?? lookup.items?.[0]
        organizationId = match?.id ?? ''
        if (!organizationId) {
          toast('error', p.provisionPartial)
          resetCreate()
          setCreateOpen(false)
          return
        }
      }
      if (!organizationId) {
        toast('error', p.createValidation)
        return
      }
      await createPlatformRestaurant({
        organizationId,
        name,
        slug,
        description: createForm.description.trim() || undefined,
        cuisineType: createForm.cuisineType.trim() || undefined,
        priceLevel,
      })
      toast('success', p.createSuccess)
      resetCreate()
      setCreateOpen(false)
      await load()
    } catch (err) {
      toast('error', userFacingApiError(err, t, p.createError))
    } finally {
      setCreating(false)
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
        emptyIcon="restaurant"
        emptyTitle={p.emptyTitle}
        emptyBody={p.emptyBody}
        filters={
          <FilterBar
            actions={
              <>
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
                <Button
                  type="button"
                  disabled={!canMutate}
                  onClick={() => {
                    resetCreate()
                    setCreateOpen(true)
                  }}
                >
                  {p.create}
                </Button>
              </>
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
                  setStatus(e.target.value as PlatformRestaurantStatus | '')
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
            <DataTableHeader>{p.colOrg}</DataTableHeader>
            <DataTableHeader>{p.colActions}</DataTableHeader>
          </DataTableHead>
          <DataTableBody>
            {items.map((row) => (
              <DataTableRow key={row.id} accent={platformRowAccent(row.status, row.deletedAt)}>
                <DataTableCell>
                  <EntityName
                    name={row.name ?? '—'}
                    secondary={row.slug}
                    icon="restaurant"
                    status={row.status}
                  />
                </DataTableCell>
                <DataTableCell>{row.slug ?? '—'}</DataTableCell>
                <DataTableCell>
                  <PlatformStatusBadge status={row.status} deletedAt={row.deletedAt} />
                </DataTableCell>
                <DataTableCell>{organizationNameFromRestaurant(row)}</DataTableCell>
                <DataTableCell>
                  <ActionMenu
                    label={c.actions}
                    disabled={busy || detailBusy}
                    items={[
                      {
                        id: 'view',
                        label: p.view,
                        icon: 'visibility',
                        onClick: () => void openDetail(row.id),
                      },
                      ...lifecycleActionsFor(row.status, row.deletedAt).map((action) => ({
                        id: action,
                        label: p[action],
                        icon: action === 'delete' ? 'delete' : 'sync',
                        danger: action === 'delete',
                        disabled: !canMutate,
                        onClick: () => setPending({ id: row.id, action }),
                      })),
                    ]}
                  />
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
        open={createOpen}
        onClose={() => {
          if (!creating) {
            setCreateOpen(false)
            resetCreate()
          }
        }}
        title={p.createTitle}
        description={p.createHint}
        footer={
          <>
            <Button variant="ghost" disabled={creating} onClick={() => setCreateOpen(false)}>
              {t.common.cancel}
            </Button>
            {step !== 'restaurant' && (
              <Button variant="secondary" disabled={creating} onClick={goBack}>
                {c.back}
              </Button>
            )}
            {step !== 'review' ? (
              <Button
                disabled={
                  creating ||
                  (step === 'restaurant' && !canAdvanceRestaurant) ||
                  (step === 'organization' && !canAdvanceOrg) ||
                  (step === 'owner' && !canAdvanceOwner)
                }
                onClick={goNext}
              >
                {c.next}
              </Button>
            ) : (
              <Button loading={creating} onClick={() => void handleCreate()}>
                {p.createSubmit}
              </Button>
            )}
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-label-md text-on-surface-variant">
            {step === 'restaurant'
              ? p.stepRestaurant
              : step === 'organization'
                ? p.stepOrganization
                : step === 'owner'
                  ? p.stepOwner
                  : p.stepReview}
          </p>

          {step === 'restaurant' && (
            <>
              <Input
                label={p.fieldName}
                value={createForm.name}
                onChange={(e) => {
                  const name = e.target.value
                  setCreateForm((f) => ({
                    ...f,
                    name,
                    slug: slugTouched ? f.slug : slugFromName(name),
                  }))
                }}
                required
                disabled={creating}
              />
              <Input
                label={p.fieldSlug}
                hint={p.slugAuto}
                value={createForm.slug}
                onChange={(e) => {
                  setSlugTouched(true)
                  setCreateForm((f) => ({ ...f, slug: e.target.value }))
                }}
                required
                disabled={creating}
              />
              <Input
                label={p.fieldDescription}
                value={createForm.description}
                onChange={(e) => setCreateForm((f) => ({ ...f, description: e.target.value }))}
                disabled={creating}
              />
              <Input
                label={p.fieldCuisine}
                value={createForm.cuisineType}
                onChange={(e) => setCreateForm((f) => ({ ...f, cuisineType: e.target.value }))}
                disabled={creating}
              />
              <Input
                label={p.fieldPriceLevel}
                hint={p.createPriceLevelHint}
                value={createForm.priceLevel}
                onChange={(e) => setCreateForm((f) => ({ ...f, priceLevel: e.target.value }))}
                inputMode="numeric"
                disabled={creating}
              />
            </>
          )}

          {step === 'organization' && (
            <>
              <Select
                label={p.organization}
                value={orgMode}
                onChange={(e) => {
                  setOrgMode(e.target.value as 'existing' | 'new')
                  setCreateOrg(null)
                }}
                disabled={creating}
              >
                <option value="existing">{p.existingOrganization}</option>
                <option value="new">{p.newOrganization}</option>
              </Select>
              {orgMode === 'existing' ? (
                <OrganizationPicker
                  selected={createOrg}
                  onSelect={setCreateOrg}
                  required
                  disabled={creating}
                  label={p.organization}
                  hint={p.organizationHint}
                />
              ) : (
                <p className="text-body-sm text-on-surface-variant">{p.ownerHint}</p>
              )}
            </>
          )}

          {step === 'owner' && (
            <>
              <p className="text-body-sm text-on-surface-variant">{p.ownerHint}</p>
              <p className="text-body-md font-semibold text-on-surface">
                {p.ownerOf.replace('{name}', createForm.name.trim() || '—')}
              </p>
              <Input
                label={p.organization}
                value={owner.organizationName}
                onChange={(e) => setOwner((o) => ({ ...o, organizationName: e.target.value }))}
                required
                disabled={creating}
              />
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Input
                  label={prov.firstName}
                  value={owner.firstName}
                  onChange={(e) => setOwner((o) => ({ ...o, firstName: e.target.value }))}
                  required
                  disabled={creating}
                />
                <Input
                  label={prov.lastName}
                  value={owner.lastName}
                  onChange={(e) => setOwner((o) => ({ ...o, lastName: e.target.value }))}
                  required
                  disabled={creating}
                />
              </div>
              <Input
                type="email"
                label={p.ownerEmail}
                value={owner.email}
                onChange={(e) => setOwner((o) => ({ ...o, email: e.target.value }))}
                required
                disabled={creating}
              />
              <GeneratedSecretField
                label={p.ownerPassword}
                hint={prov.passwordHint}
                value={owner.password}
                disabled={creating}
                generateLabel={c.generatePassword}
                regenerateLabel={c.regenerate}
                copyLabel={t.common.copy}
                copiedLabel={t.common.copied}
                onChange={(value) => setOwner((o) => ({ ...o, password: value }))}
                onGenerate={() => setOwner((o) => ({ ...o, password: generateSecurePassword() }))}
              />
            </>
          )}

          {step === 'review' && (
            <dl className="space-y-2 text-body-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-on-surface-variant">{p.fieldName}</dt>
                <dd className="font-medium text-on-surface">{createForm.name}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-on-surface-variant">{p.fieldSlug}</dt>
                <dd className="font-medium text-on-surface">{createForm.slug}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-on-surface-variant">{p.organization}</dt>
                <dd className="font-medium text-on-surface">
                  {orgMode === 'existing' ? createOrg?.name : owner.organizationName}
                </dd>
              </div>
              {orgMode === 'new' && (
                <div className="flex justify-between gap-4">
                  <dt className="text-on-surface-variant">{p.ownerEmail}</dt>
                  <dd className="font-medium text-on-surface">{owner.email}</dd>
                </div>
              )}
              <p className="pt-2 text-on-surface-variant">
                {orgMode === 'new' ? p.provisionThenCreate : p.createHint}
              </p>
            </dl>
          )}
        </div>
      </Modal>

      <Modal open={detail !== null} onClose={() => setDetail(null)} title={p.detailTitle} size="lg">
        {detail ? <RecordDl record={detail as Record<string, unknown>} /> : null}
      </Modal>
    </>
  )
}
