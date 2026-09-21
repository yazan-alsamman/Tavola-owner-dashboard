import { Link, Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { useLocale } from '@/context/LocaleContext'
import { isPlatformActor } from '@/types/auth'

/**
 * Browse platform UI without PlatformAdmin auth.
 * Off by default — this app’s login wall is the intended entry.
 * Set `VITE_PLATFORM_PREVIEW=true` to skip auth while exploring UI.
 */
export function isPlatformPreviewEnabled(): boolean {
  return import.meta.env.VITE_PLATFORM_PREVIEW === 'true'
}

function AuthLoadingScreen() {
  const { t } = useLocale()
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-3 text-on-surface-variant">
        <div
          className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin"
          aria-hidden
        />
        <p className="text-body-md">{t.auth.resolvingSession}</p>
      </div>
    </div>
  )
}

/** Guards Platform Owner routes — requires PlatformAdmin / PlatformSupport, or preview mode. */
export function PlatformRoute() {
  const { user, isAuthenticated, isLoading } = useAuth()

  if (isLoading) {
    return <AuthLoadingScreen />
  }

  const isConsoleActor = isAuthenticated && isPlatformActor(user?.actorType)
  if (!isConsoleActor && !isPlatformPreviewEnabled()) {
    return <Navigate to="/platform/login" replace />
  }

  return <Outlet />
}

export function PlatformPreviewBanner() {
  const { t } = useLocale()
  const { isAuthenticated, user } = useAuth()
  const isConsoleActor = isAuthenticated && isPlatformActor(user?.actorType)

  if (isConsoleActor || !isPlatformPreviewEnabled()) return null

  return (
    <div
      role="status"
      className="border-b border-warning/40 bg-warning-light px-4 py-2 text-center text-sm text-on-surface"
    >
      <span className="font-semibold">{t.platform.preview.title}</span>
      {' — '}
      {t.platform.preview.body}{' '}
      <Link
        to="/platform/login"
        className="font-semibold text-primary underline underline-offset-2"
      >
        {t.platform.preview.signIn}
      </Link>
    </div>
  )
}
