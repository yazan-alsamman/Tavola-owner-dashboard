import { useCallback, useEffect, useId, useRef, useState } from 'react'
import {
  searchPlatformAccounts,
  searchPlatformOrganizations,
  searchPlatformRestaurants,
  type PlatformOrganizationLookupDto,
  type PlatformRestaurantLookupDto,
  type PlatformUserAccountDto,
} from '@/platform/api/platformAdmin'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { MaterialIcon } from '@/components/ui/Icon'
import { useLocale } from '@/context/LocaleContext'
import { useDebouncedValue } from '@/platform/ui/useDebouncedValue'
import { asRecord, pickRaw } from '@/platform/ui/recordFields'
import { PlatformStatusBadge } from '@/platform/ui/PlatformStatusBadge'
import { cn } from '@/lib/utils'

export interface SearchPickerItem {
  id: string
}

export function entityLabel(row: { name?: string; slug?: string }): string {
  return row.name?.trim() || row.slug?.trim() || '—'
}

export function accountLabel(row: PlatformUserAccountDto): string {
  const name = [row.firstName, row.lastName].filter(Boolean).join(' ').trim()
  return name || row.email?.trim() || '—'
}

export function organizationNameFromRestaurant(
  row: PlatformRestaurantLookupDto,
): string {
  const record = asRecord(row)
  const nested = asRecord(record.organization)
  const fromRow = pickRaw(record, ['organizationName', 'orgName'])
  const fromNested = pickRaw(nested, ['name', 'slug'])
  const value = fromRow ?? fromNested
  return typeof value === 'string' && value.trim() ? value.trim() : '—'
}

export function EntitySearchPicker<T extends SearchPickerItem>({
  label,
  placeholder,
  hint,
  icon = 'search',
  selected,
  onSelect,
  search,
  getLabel,
  getSecondary,
  getStatus,
  disabled = false,
  required = false,
  className,
}: {
  label: string
  placeholder: string
  hint?: string
  icon?: string
  selected: T | null
  onSelect: (item: T | null) => void
  search: (q: string, signal: AbortSignal) => Promise<T[]>
  getLabel: (item: T) => string
  getSecondary?: (item: T) => string | undefined
  getStatus?: (item: T) => string | undefined
  disabled?: boolean
  required?: boolean
  className?: string
}) {
  const { t } = useLocale()
  const p = t.platform.picker
  const listId = useId()
  const rootRef = useRef<HTMLDivElement>(null)
  const [query, setQuery] = useState('')
  const debounced = useDebouncedValue(query, 300)
  const [matches, setMatches] = useState<T[]>([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (disabled || selected || debounced.trim().length < 1) {
      setMatches([])
      setLoading(false)
      return
    }
    const ac = new AbortController()
    setLoading(true)
    void search(debounced.trim(), ac.signal)
      .then((rows) => {
        if (!ac.signal.aborted) setMatches(rows)
      })
      .catch(() => {
        if (!ac.signal.aborted) setMatches([])
      })
      .finally(() => {
        if (!ac.signal.aborted) setLoading(false)
      })
    return () => ac.abort()
  }, [debounced, disabled, search, selected])

  useEffect(() => {
    const onPointer = (event: MouseEvent): void => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onPointer)
    return () => document.removeEventListener('mousedown', onPointer)
  }, [])

  if (selected) {
    const secondary = getSecondary?.(selected)
    return (
      <div className={cn('flex min-w-[240px] flex-1 flex-col gap-1.5', className)}>
        <span className="text-label-md text-on-surface-variant">
          {label}
          {required && (
            <span className="text-error ms-0.5" aria-hidden="true">
              *
            </span>
          )}
        </span>
        <div className="flex items-center gap-3 rounded-lg border border-primary-border bg-primary-subtle px-3 py-2">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-surface-container-lowest text-primary">
            <MaterialIcon name={icon} size={16} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-body-sm font-semibold text-on-surface">{getLabel(selected)}</p>
            {secondary ? (
              <p className="truncate text-label-sm text-on-surface-variant">{secondary}</p>
            ) : null}
          </div>
          {getStatus?.(selected) ? <PlatformStatusBadge status={getStatus(selected)} /> : null}
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            disabled={disabled}
            aria-label={p.clear}
            onClick={() => {
              onSelect(null)
              setQuery('')
              setMatches([])
              setOpen(false)
            }}
          >
            <MaterialIcon name="close" size={16} />
          </Button>
        </div>
        {hint ? <p className="text-body-sm text-on-surface-variant">{hint}</p> : null}
      </div>
    )
  }

  const showList = open && (loading || query.trim().length > 0)

  return (
    <div ref={rootRef} className={cn('relative min-w-[240px] flex-1', className)}>
      <Input
        label={label}
        value={query}
        onChange={(e) => {
          setQuery(e.target.value)
          setOpen(true)
        }}
        onFocus={() => setOpen(true)}
        placeholder={placeholder}
        hint={hint}
        required={required}
        disabled={disabled}
        autoComplete="off"
        role="combobox"
        aria-expanded={showList}
        aria-controls={listId}
        icon={<MaterialIcon name={icon} size={18} />}
      />
      {showList && (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-50 mt-1 max-h-64 w-full overflow-auto rounded-xl border border-outline-variant/70 bg-surface-container-lowest p-1 elev-3"
        >
          {loading && matches.length === 0 ? (
            <li className="px-3 py-2 text-body-sm text-on-surface-variant">{p.searching}</li>
          ) : matches.length === 0 ? (
            <li className="px-3 py-2 text-body-sm text-on-surface-variant">{p.noMatches}</li>
          ) : (
            matches.map((row) => {
              const secondary = getSecondary?.(row)
              return (
                <li key={row.id} role="option">
                  <button
                    type="button"
                    className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-start hover:bg-surface-container-high"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      onSelect(row)
                      setQuery('')
                      setMatches([])
                      setOpen(false)
                    }}
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary-subtle text-primary">
                      <MaterialIcon name={icon} size={15} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-body-sm font-medium text-on-surface">
                        {getLabel(row)}
                      </span>
                      {secondary ? (
                        <span className="block truncate text-label-sm text-on-surface-variant">
                          {secondary}
                        </span>
                      ) : null}
                    </span>
                    {getStatus?.(row) ? <PlatformStatusBadge status={getStatus(row)} /> : null}
                  </button>
                </li>
              )
            })
          )}
        </ul>
      )}
    </div>
  )
}

export function RestaurantPicker({
  selected,
  onSelect,
  disabled,
  required,
  label,
  hint,
  className,
}: {
  selected: PlatformRestaurantLookupDto | null
  onSelect: (item: PlatformRestaurantLookupDto | null) => void
  disabled?: boolean
  required?: boolean
  label?: string
  hint?: string
  className?: string
}) {
  const { t } = useLocale()
  const searchRestaurants = useCallback(
    async (q: string, signal: AbortSignal) => {
      const result = await searchPlatformRestaurants({ q, page: 1, pageSize: 8 }, signal)
      return result.items ?? []
    },
    [],
  )
  return (
    <EntitySearchPicker
      label={label ?? t.platform.picker.restaurant}
      placeholder={t.platform.picker.restaurantPlaceholder}
      hint={hint}
      icon="restaurant"
      selected={selected}
      onSelect={onSelect}
      disabled={disabled}
      required={required}
      className={className}
      search={searchRestaurants}
      getLabel={entityLabel}
      getSecondary={(row) => row.slug}
      getStatus={(row) => row.status}
    />
  )
}

export function OrganizationPicker({
  selected,
  onSelect,
  disabled,
  required,
  label,
  hint,
  className,
}: {
  selected: PlatformOrganizationLookupDto | null
  onSelect: (item: PlatformOrganizationLookupDto | null) => void
  disabled?: boolean
  required?: boolean
  label?: string
  hint?: string
  className?: string
}) {
  const { t } = useLocale()
  const searchOrganizations = useCallback(
    async (q: string, signal: AbortSignal) => {
      const result = await searchPlatformOrganizations({ q, page: 1, pageSize: 8 }, signal)
      return result.items ?? []
    },
    [],
  )
  return (
    <EntitySearchPicker
      label={label ?? t.platform.picker.organization}
      placeholder={t.platform.picker.organizationPlaceholder}
      hint={hint}
      icon="corporate_fare"
      selected={selected}
      onSelect={onSelect}
      disabled={disabled}
      required={required}
      className={className}
      search={searchOrganizations}
      getLabel={entityLabel}
      getSecondary={(row) => row.slug}
      getStatus={(row) => row.status}
    />
  )
}

export function AccountPicker({
  selected,
  onSelect,
  disabled,
  required,
  label,
  hint,
  accountType,
  className,
}: {
  selected: PlatformUserAccountDto | null
  onSelect: (item: PlatformUserAccountDto | null) => void
  disabled?: boolean
  required?: boolean
  label?: string
  hint?: string
  accountType?: string
  className?: string
}) {
  const { t } = useLocale()
  const searchAccounts = useCallback(
    async (q: string, signal: AbortSignal) => {
      const result = await searchPlatformAccounts(
        { q, accountType, page: 1, pageSize: 8 },
        signal,
      )
      return result.items ?? []
    },
    [accountType],
  )
  return (
    <EntitySearchPicker
      label={label ?? t.platform.picker.account}
      placeholder={t.platform.picker.accountPlaceholder}
      hint={hint}
      icon="person"
      selected={selected}
      onSelect={onSelect}
      disabled={disabled}
      required={required}
      className={className}
      search={searchAccounts}
      getLabel={accountLabel}
      getSecondary={(row) => row.email}
      getStatus={(row) => row.status}
    />
  )
}
