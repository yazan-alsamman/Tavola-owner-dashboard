import { MaterialIcon } from '@/components/ui/Icon'
import type { BadgeTone } from '@/components/ui/Badge'
import { cn } from '@/lib/utils'
import { platformStatusTone } from '@/platform/ui/statusTone'

const toneClass: Record<BadgeTone, string> = {
  success: 'bg-success-subtle text-on-success-subtle',
  warning: 'bg-warning-subtle text-on-warning-subtle',
  danger: 'bg-danger-subtle text-on-danger-subtle',
  info: 'bg-info-subtle text-on-info-subtle',
  brand: 'bg-primary-subtle text-primary',
  neutral: 'bg-surface-container-high text-on-surface-variant',
}

export function EntityName({
  name,
  secondary,
  icon,
  status,
}: {
  name: string
  secondary?: string | null
  icon?: string
  status?: string | null
}) {
  const tone = platformStatusTone(status ?? undefined)
  return (
    <div className="flex min-w-0 items-center gap-3">
      <span
        className={cn(
          'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg',
          toneClass[tone],
        )}
      >
        {icon ? (
          <MaterialIcon name={icon} size={16} />
        ) : (
          <span className="text-label-md font-semibold">
            {(name.trim()[0] ?? '?').toLocaleUpperCase()}
          </span>
        )}
      </span>
      <span className="min-w-0">
        <span className="block truncate font-medium text-on-surface">{name || '—'}</span>
        {secondary ? (
          <span className="block truncate text-label-sm text-on-surface-variant">{secondary}</span>
        ) : null}
      </span>
    </div>
  )
}
