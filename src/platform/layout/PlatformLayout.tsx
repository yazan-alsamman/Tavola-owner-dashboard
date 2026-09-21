import { Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { useLocale } from '@/context/LocaleContext'
import { useSidebar } from '@/context/SidebarContext'
import { useTheme } from '@/context/ThemeContext'
import { MaterialIcon } from '@/components/ui/Icon'
import { Button } from '@/components/ui/Button'
import { PlatformPreviewBanner } from '@/platform/auth/PlatformRoute'
import {
  SidebarAccount,
  SidebarAction,
  SidebarBrand,
  SidebarNavItem,
  SidebarSection,
  SidebarShell,
  sidebarWidthVars,
} from '@/components/layout/SidebarNav'
import { cn } from '@/lib/utils'

type PlatformNavItem = { path: string; icon: string; label: string; end?: boolean }

function usePlatformNavGroups(): { label: string; items: PlatformNavItem[] }[] {
  const { t } = useLocale()
  const p = t.platform.nav

  return [
    {
      label: t.platform.navGroups.insight,
      items: [
        { path: '/platform', icon: 'dashboard', label: p.dashboard, end: true },
        { path: '/platform/revenue', icon: 'payments', label: p.revenue },
        { path: '/platform/acquisitions', icon: 'campaign', label: p.acquisitions },
      ],
    },
    {
      label: t.platform.navGroups.tenants,
      items: [
        { path: '/platform/restaurants', icon: 'restaurant', label: p.restaurants },
        { path: '/platform/organizations', icon: 'corporate_fare', label: p.organizations },
        { path: '/platform/provision', icon: 'person_add', label: p.provision },
        { path: '/platform/pricing', icon: 'sell', label: p.pricing },
        { path: '/platform/subscriptions', icon: 'credit_card', label: p.subscriptions },
      ],
    },
    {
      label: t.platform.navGroups.console,
      items: [
        { path: '/platform/admins', icon: 'admin_panel_settings', label: p.admins },
        { path: '/platform/accounts', icon: 'manage_accounts', label: p.accounts },
        { path: '/platform/notifications', icon: 'notifications', label: p.notifications },
        { path: '/platform/audit-logs', icon: 'history', label: p.auditLogs },
      ],
    },
  ]
}

function useCurrentPage(groups: { items: PlatformNavItem[] }[]): {
  label: string
  icon: string
} {
  const { pathname } = useLocation()
  const { t } = useLocale()
  const items = groups.flatMap((group) => group.items)
  const match = items
    .filter((item) =>
      item.end ? pathname === item.path : pathname === item.path || pathname.startsWith(`${item.path}/`),
    )
    .sort((a, b) => b.path.length - a.path.length)[0]
  return {
    label: match?.label ?? t.platform.nav.dashboard,
    icon: match?.icon ?? 'dashboard',
  }
}

export function PlatformLayout() {
  const { t, toggleLocale, locale } = useLocale()
  const { theme, toggleTheme } = useTheme()
  const { isOpen, isCollapsed, close, toggle, toggleCollapse } = useSidebar()
  const { user, logout } = useAuth()
  const groups = usePlatformNavGroups()
  const page = useCurrentPage(groups)
  const sidebarContext = user?.email ?? user?.displayName ?? t.platform.preview.guestLabel

  return (
    <div
      className="min-h-screen bg-background pt-[var(--logout-leave-banner-h,0px)]"
      style={sidebarWidthVars(isCollapsed)}
    >
      <SidebarShell isOpen={isOpen} onClose={close} ariaLabel={t.platform.brand}>
        <SidebarBrand
          title={t.platform.brand}
          shortTitle={t.platform.brandShort}
          context={sidebarContext}
          isCollapsed={isCollapsed}
        />

        <nav className="flex-1 overflow-y-auto scrollbar-none pb-2">
          {groups.map((group, groupIndex) => (
            <SidebarSection
              key={group.label}
              label={group.label}
              isCollapsed={isCollapsed}
              first={groupIndex === 0}
            >
              {group.items.map(({ path, icon, label, end }) => (
                <SidebarNavItem
                  key={path}
                  to={path}
                  icon={icon}
                  label={label}
                  end={end}
                  isCollapsed={isCollapsed}
                  onNavigate={close}
                />
              ))}
            </SidebarSection>
          ))}
        </nav>

        <SidebarAccount
          initials={user?.initials}
          name={user?.displayName ?? t.platform.preview.guestLabel}
          meta={user?.actorType ?? t.platform.preview.guestHint}
          icon={user ? undefined : 'visibility'}
          isCollapsed={isCollapsed}
        >
          {user ? (
            <SidebarAction
              icon="logout"
              label={t.header.logout}
              isCollapsed={isCollapsed}
              onClick={() => {
                void logout()
              }}
            />
          ) : (
            <SidebarAction
              icon="login"
              label={t.platform.preview.signIn}
              isCollapsed={isCollapsed}
              to="/platform/login"
            />
          )}
        </SidebarAccount>
      </SidebarShell>

      <div className="transition-[margin] duration-[var(--duration-slow)] ease-[var(--ease-standard)] lg:ms-[var(--sidebar-w)]">
        <div className="sticky top-0 z-40">
          <PlatformPreviewBanner />
          <header
            className={cn(
              'flex h-16 w-full items-center justify-between gap-3 px-4 lg:px-8',
              'glass bg-surface/85 border-b border-outline-variant/50',
            )}
          >
            <div className="flex min-w-0 items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden"
                onClick={toggle}
                aria-label={t.header.openMenu}
              >
                <MaterialIcon name="menu" size={20} />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="hidden lg:inline-flex"
                onClick={toggleCollapse}
                aria-label={t.header.toggleSidebar}
                aria-pressed={isCollapsed}
              >
                <MaterialIcon
                  name={isCollapsed ? 'chevron_right' : 'chevron_left'}
                  size={20}
                  className="rtl:rotate-180"
                />
              </Button>
              <span className="hidden h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary-subtle text-primary lg:flex">
                <MaterialIcon name={page.icon} size={16} />
              </span>
              <span className="truncate text-headline-md font-semibold text-on-surface">
                {page.label}
              </span>
            </div>

            <div className="flex min-w-0 items-center gap-2">
              <Button variant="ghost" size="icon" onClick={toggleTheme} aria-label={t.header.theme}>
                <MaterialIcon name={theme === 'dark' ? 'light_mode' : 'dark_mode'} size={19} />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleLocale}
                aria-label={t.header.language}
                className="uppercase"
              >
                {locale === 'ar' ? 'EN' : 'ع'}
              </Button>
              {user && (
                <>
                  <span className="hidden min-w-0 max-w-[180px] flex-col items-end sm:flex">
                    <span className="truncate text-label-md text-on-surface">{user.displayName}</span>
                    <span className="truncate text-label-sm text-on-surface-variant">{user.email}</span>
                  </span>
                  <Button variant="ghost" size="sm" onClick={() => void logout()}>
                    {t.header.logout}
                  </Button>
                </>
              )}
            </div>
          </header>
        </div>

        <main className="mx-auto w-full max-w-[1440px] px-4 py-6 md:px-8 md:py-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
