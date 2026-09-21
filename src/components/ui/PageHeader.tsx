import { Link } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { MaterialIcon } from '@/components/ui/Icon'
import type { ReactNode } from 'react'

export interface Breadcrumb {
  label: string
  to?: string
}

interface PageHeaderProps {
  title: string
  subtitle?: string
  actions?: ReactNode
  /** Trail to the parent screen. Omit on top-level pages. */
  breadcrumbs?: Breadcrumb[]
  /** Status badges or counts shown inline with the title. */
  meta?: ReactNode
  className?: string
}

/**
 * Answers "where am I", "what is this for", and "what can I do" in that order.
 * Actions sit on the title's baseline on desktop and stack full-width on mobile
 * so the primary action stays reachable.
 */
export function PageHeader({
  title,
  subtitle,
  actions,
  breadcrumbs,
  meta,
  className,
}: PageHeaderProps) {
  return (
    <div className={cn('mb-6', className)}>
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav aria-label="Breadcrumb" className="mb-2">
          <ol className="flex flex-wrap items-center gap-1 text-body-sm text-on-surface-variant">
            {breadcrumbs.map((crumb, i) => (
              <li key={`${crumb.label}-${i}`} className="flex items-center gap-1">
                {i > 0 && (
                  <MaterialIcon
                    name="chevron_right"
                    size={14}
                    className="text-outline rtl:rotate-180"
                  />
                )}
                {crumb.to ? (
                  <Link
                    to={crumb.to}
                    className="rounded-sm transition-colors duration-[var(--duration-fast)] hover:text-on-surface hover:underline underline-offset-2"
                  >
                    {crumb.label}
                  </Link>
                ) : (
                  <span aria-current="page">{crumb.label}</span>
                )}
              </li>
            ))}
          </ol>
        </nav>
      )}

      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-headline-lg text-on-surface">{title}</h1>
            {meta}
          </div>
          {subtitle && (
            <p className="text-body-md text-on-surface-variant mt-1.5 max-w-2xl leading-relaxed">
              {subtitle}
            </p>
          )}
        </div>

        {actions && (
          <div className="flex flex-wrap items-center gap-2 md:shrink-0 [&>*]:max-md:flex-1">
            {actions}
          </div>
        )}
      </div>
    </div>
  )
}
