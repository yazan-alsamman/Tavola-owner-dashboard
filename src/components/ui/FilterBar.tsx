import { cn } from '@/lib/utils'
import type { ReactNode } from 'react'

interface FilterBarProps {
  children: ReactNode
  /** Right-aligned actions — apply, reset, export. */
  actions?: ReactNode
  /** Result count or active-filter summary shown under the controls. */
  summary?: ReactNode
  className?: string
}

/**
 * Consistent home for page-level filters. Controls align on their baseline and
 * actions stay pinned to the trailing edge, so every screen filters the same way.
 */
export function FilterBar({ children, actions, summary, className }: FilterBarProps) {
  return (
    <div
      className={cn(
        'rounded-xl border border-outline-variant/60 bg-surface-container-lowest elev-1',
        'px-4 py-4 sm:px-5',
        className,
      )}
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex flex-1 flex-wrap items-end gap-3">{children}</div>
        {actions && <div className="flex flex-wrap items-center gap-2 lg:shrink-0">{actions}</div>}
      </div>
      {summary && (
        <div className="mt-3 border-t border-outline-variant/40 pt-3 text-body-sm text-on-surface-variant">
          {summary}
        </div>
      )}
    </div>
  )
}
