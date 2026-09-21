import { cn } from '@/lib/utils'

interface SkeletonProps {
  className?: string
}

/** Single placeholder block. Size it to match the content it replaces. */
export function Skeleton({ className }: SkeletonProps) {
  return <div className={cn('skeleton h-4 w-full', className)} aria-hidden="true" />
}

/**
 * Loading states are announced once rather than per placeholder, so screen
 * readers get "loading" instead of a wall of empty nodes.
 */
function LoadingRegion({
  label,
  className,
  children,
}: {
  label: string
  className?: string
  children: React.ReactNode
}) {
  return (
    <div role="status" aria-live="polite" aria-busy="true" className={className}>
      <span className="sr-only">{label}</span>
      {children}
    </div>
  )
}

export function SkeletonText({
  lines = 3,
  label = 'Loading',
  className,
}: {
  lines?: number
  label?: string
  className?: string
}) {
  return (
    <LoadingRegion label={label} className={cn('space-y-2', className)}>
      {Array.from({ length: lines }, (_, i) => (
        <Skeleton key={i} className={i === lines - 1 ? 'w-2/3' : 'w-full'} />
      ))}
    </LoadingRegion>
  )
}

/** Mirrors the StatCard grid so the page does not reflow when data lands. */
export function SkeletonStats({
  count = 4,
  label = 'Loading metrics',
  className,
}: {
  count?: number
  label?: string
  className?: string
}) {
  return (
    <LoadingRegion
      label={label}
      className={cn('grid gap-4 sm:grid-cols-2 xl:grid-cols-4', className)}
    >
      {Array.from({ length: count }, (_, i) => (
        <div
          key={i}
          className="rounded-xl border border-outline-variant/60 bg-surface-container-lowest p-5 elev-1"
        >
          <Skeleton className="h-3 w-24" />
          <Skeleton className="mt-4 h-8 w-20" />
          <Skeleton className="mt-3 h-3 w-32" />
        </div>
      ))}
    </LoadingRegion>
  )
}

/** Mirrors DataTable structure: header strip plus evenly spaced rows. */
export function SkeletonTable({
  rows = 6,
  columns = 5,
  label = 'Loading table',
  className,
}: {
  rows?: number
  columns?: number
  label?: string
  className?: string
}) {
  return (
    <LoadingRegion
      label={label}
      className={cn(
        'overflow-hidden rounded-xl border border-outline-variant/60 bg-surface-container-lowest elev-1',
        className,
      )}
    >
      <div className="flex items-center gap-4 border-b border-outline-variant/50 bg-surface-container-low/60 px-5 py-3">
        {Array.from({ length: columns }, (_, i) => (
          <Skeleton key={i} className="h-3 flex-1" />
        ))}
      </div>
      <div className="divide-y divide-outline-variant/40">
        {Array.from({ length: rows }, (_, r) => (
          <div key={r} className="flex items-center gap-4 px-5 py-4">
            {Array.from({ length: columns }, (_, c) => (
              <Skeleton key={c} className={cn('h-4 flex-1', c === 0 && 'max-w-40')} />
            ))}
          </div>
        ))}
      </div>
    </LoadingRegion>
  )
}

export function SkeletonCard({ className }: SkeletonProps) {
  return (
    <LoadingRegion
      label="Loading"
      className={cn(
        'rounded-xl border border-outline-variant/60 bg-surface-container-lowest p-5 elev-1',
        className,
      )}
    >
      <Skeleton className="h-4 w-32" />
      <Skeleton className="mt-4 h-3 w-full" />
      <Skeleton className="mt-2 h-3 w-5/6" />
      <Skeleton className="mt-2 h-3 w-3/4" />
    </LoadingRegion>
  )
}
