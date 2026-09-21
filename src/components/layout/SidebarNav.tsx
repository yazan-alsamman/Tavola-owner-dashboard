import { NavLink } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { MaterialIcon } from '@/components/ui/Icon'
import { Num } from '@/components/ui/Num'
import type { CSSProperties, ReactNode } from 'react'

/** Single source of truth for shell geometry — layouts read these for content offset. */
export const SIDEBAR_WIDTH_EXPANDED = '264px'
export const SIDEBAR_WIDTH_COLLAPSED = '76px'

export function sidebarWidthVars(isCollapsed: boolean): CSSProperties {
  return {
    '--sidebar-w': isCollapsed ? SIDEBAR_WIDTH_COLLAPSED : SIDEBAR_WIDTH_EXPANDED,
  } as CSSProperties
}

/**
 * Fixed rail shared by the restaurant and platform shells. Positioning,
 * transition, and mobile off-canvas behaviour live here only once.
 */
export function SidebarShell({
  isOpen,
  onClose,
  children,
  ariaLabel,
}: {
  isOpen: boolean
  onClose: () => void
  children: ReactNode
  ariaLabel: string
}) {
  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-inverse-surface/40 backdrop-blur-sm lg:hidden animate-fade-in"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        aria-label={ariaLabel}
        className={cn(
          'fixed top-[var(--logout-leave-banner-h,0px)] start-0 z-50 flex flex-col',
          'h-[calc(100%-var(--logout-leave-banner-h,0px))] w-[var(--sidebar-w)]',
          'bg-surface border-e border-outline-variant/50 py-5',
          'transition-[width,transform] duration-[var(--duration-slow)] ease-[var(--ease-standard)]',
          'lg:translate-x-0 lg:elev-0',
          isOpen
            ? 'translate-x-0 elev-4'
            : 'max-lg:translate-x-full max-lg:ltr:-translate-x-full lg:translate-x-0',
        )}
      >
        {children}
      </aside>
    </>
  )
}

/** Wordmark plus one line of context (selected restaurant, or console name). */
export function SidebarBrand({
  title,
  shortTitle,
  context,
  isCollapsed,
}: {
  title: string
  shortTitle: string
  context?: ReactNode
  isCollapsed: boolean
}) {
  return (
    <div className={cn('shrink-0 mb-5', isCollapsed ? 'px-2 text-center' : 'px-5')}>
      {isCollapsed ? (
        <span className="text-headline-md text-primary font-bold">{shortTitle}</span>
      ) : (
        <>
          <h1 className="text-headline-md text-primary font-bold tracking-tight">{title}</h1>
          {context && (
            <p className="text-body-sm text-on-surface-variant mt-0.5 truncate">{context}</p>
          )}
        </>
      )}
    </div>
  )
}

/** Group label. Collapsed rails get a hairline instead of unreadable text. */
export function SidebarSection({
  label,
  isCollapsed,
  children,
  first = false,
}: {
  label: string
  isCollapsed: boolean
  children: ReactNode
  first?: boolean
}) {
  return (
    <div className={first ? undefined : 'mt-5'}>
      {isCollapsed ? (
        !first && <div className="mx-4 mb-3 h-px bg-outline-variant/50" />
      ) : (
        <p className="px-5 mb-1.5 text-overline text-on-surface-variant/75">{label}</p>
      )}
      <div className="space-y-0.5">{children}</div>
    </div>
  )
}

/**
 * Active state reads through a brand-tinted surface, brand text, and a brand
 * icon at once — recognisable without an aggressive full-height border.
 */
export function SidebarNavItem({
  to,
  icon,
  label,
  isCollapsed,
  end = false,
  badge,
  onNavigate,
}: {
  to: string
  icon: string
  label: string
  isCollapsed: boolean
  end?: boolean
  badge?: number
  onNavigate?: () => void
}) {
  const showBadge = badge !== undefined && badge > 0

  return (
    <NavLink
      to={to}
      end={end}
      onClick={onNavigate}
      title={isCollapsed ? label : undefined}
      className={({ isActive }) =>
        cn(
          'relative mx-2 flex h-9 items-center gap-3 rounded-lg text-label-md',
          'transition-colors duration-[var(--duration-fast)] ease-[var(--ease-standard)]',
          'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary',
          isCollapsed ? 'justify-center px-0' : 'px-3',
          isActive
            ? 'bg-primary-subtle text-primary'
            : 'text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface',
        )
      }
    >
      {({ isActive }) => (
        <>
          <span className="relative shrink-0">
            <MaterialIcon
              name={icon}
              size={18}
              className={isActive ? 'text-primary' : 'text-outline'}
            />
            {isCollapsed && showBadge && (
              <span className="absolute -top-0.5 -end-0.5 h-2 w-2 rounded-full bg-error ring-2 ring-surface" />
            )}
          </span>

          {!isCollapsed && (
            <>
              <span className="flex-1 truncate">{label}</span>
              {showBadge && (
                <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-error px-1.5 text-label-sm font-bold text-on-error nums">
                  <Num>{badge}</Num>
                </span>
              )}
            </>
          )}
        </>
      )}
    </NavLink>
  )
}

/** Identity block pinned to the bottom of the rail, above the sign-out control. */
export function SidebarAccount({
  initials,
  name,
  meta,
  isCollapsed,
  icon,
  children,
}: {
  initials?: string
  name: string
  meta?: string
  isCollapsed: boolean
  /** Used instead of initials for the guest/preview state. */
  icon?: string
  children?: ReactNode
}) {
  return (
    <div className="mt-auto shrink-0 pt-4 border-t border-outline-variant/50">
      {!isCollapsed && (
        <div className="mx-2 mb-2 flex items-center gap-3 rounded-lg px-3 py-2">
          <span
            className={cn(
              'flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-label-md font-bold',
              icon
                ? 'bg-surface-container-high text-on-surface-variant'
                : 'bg-primary-subtle text-primary ring-1 ring-primary-border',
            )}
          >
            {icon ? <MaterialIcon name={icon} size={16} /> : initials}
          </span>
          <div className="min-w-0">
            <p className="text-label-lg text-on-surface truncate">{name}</p>
            {meta && <p className="text-body-sm text-on-surface-variant truncate">{meta}</p>}
          </div>
        </div>
      )}
      {children}
    </div>
  )
}

/** Sign in / sign out control styled to match nav items rather than a button. */
export function SidebarAction({
  icon,
  label,
  isCollapsed,
  onClick,
  to,
}: {
  icon: string
  label: string
  isCollapsed: boolean
  onClick?: () => void
  to?: string
}) {
  const className = cn(
    'mx-2 flex h-9 items-center gap-3 rounded-lg text-label-md w-[calc(100%-1rem)]',
    'text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface',
    'transition-colors duration-[var(--duration-fast)]',
    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary',
    isCollapsed ? 'justify-center px-0' : 'px-3',
  )

  if (to) {
    return (
      <NavLink to={to} className={className} title={isCollapsed ? label : undefined}>
        <MaterialIcon name={icon} size={18} className="text-outline shrink-0" />
        {!isCollapsed && <span className="truncate">{label}</span>}
      </NavLink>
    )
  }

  return (
    <button type="button" onClick={onClick} className={className} title={isCollapsed ? label : undefined}>
      <MaterialIcon name={icon} size={18} className="text-outline shrink-0" />
      {!isCollapsed && <span className="truncate">{label}</span>}
    </button>
  )
}
