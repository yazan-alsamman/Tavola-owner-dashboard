import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { formatApiFieldErrors, isApiError } from '@/api/errors'
import { useAuth } from '@/context/AuthContext'
import { useLocale } from '@/context/LocaleContext'
import { MaterialIcon } from '@/components/ui/Icon'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { isPlatformPreviewEnabled } from '@/platform/auth/PlatformRoute'
import { isPlatformActor } from '@/types/auth'
import { useTheme } from '@/context/ThemeContext'

function mapLoginError(
  error: unknown,
  t: ReturnType<typeof useLocale>['t'],
): string {
  if (!isApiError(error)) {
    return t.platform.login.errorUnknown
  }

  const fieldErrors = formatApiFieldErrors(error)

  switch (error.code) {
    case 'AUTH_INVALID_CREDENTIALS':
      return t.login.errors.invalidCredentials
    case 'AUTH_ACCOUNT_LOCKED':
      return t.login.errors.accountLocked
    case 'AUTH_ACCOUNT_SUSPENDED':
      return t.login.errors.accountSuspended
    case 'AUTH_EMAIL_NOT_VERIFIED':
      return t.login.errors.emailNotVerified
    case 'AUTH_TOO_MANY_SESSIONS':
      return t.login.errors.tooManySessions
    case 'RATE_LIMIT_EXCEEDED':
      return t.login.errors.rateLimited
    case 'FORBIDDEN':
      return t.platform.login.errorForbidden
    case 'VALIDATION_ERROR':
      return fieldErrors || error.message || t.login.errors.validation
    default:
      return error.message || t.platform.login.errorUnknown
  }
}

export function PlatformLoginPage() {
  const { loginPlatformAdmin, user, isAuthenticated } = useAuth()
  const { t, toggleLocale, locale } = useLocale()
  const { theme, toggleTheme } = useTheme()
  const navigate = useNavigate()
  const p = t.platform.login

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  if (isAuthenticated && isPlatformActor(user?.platformRole ?? user?.actorType)) {
    return <Navigate to="/platform" replace />
  }

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault()
    if (submitting) return
    setError('')
    setSubmitting(true)
    try {
      await loginPlatformAdmin(email.trim(), password)
      navigate('/platform', { replace: true })
    } catch (err) {
      setError(mapLoginError(err, t))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 overflow-hidden relative bg-background">
      <div className="fixed inset-0 z-0 bg-mauve-gradient" />

      <div className="fixed top-4 end-4 z-30 flex items-center gap-2">
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
      </div>

      <main className="relative z-20 w-full max-w-[440px] animate-slide-up">
        <div className="flex flex-col items-center mb-8">
          <span className="text-display text-primary tracking-tight font-bold">{t.platform.brand}</span>
          <div className="h-1 w-12 bg-primary rounded-full my-4" />
          <h1 className="text-headline-md text-on-surface text-center">{p.title}</h1>
          <p className="text-body-md text-on-surface-variant text-center mt-2 px-4">
            {p.subtitle}
          </p>
        </div>

        <div className="glass-panel p-8 rounded-xl shadow-lg">
          <div className="mb-6 flex items-center gap-3 bg-secondary-container/30 p-3 rounded-lg border border-outline-variant/30">
            <MaterialIcon name="admin_panel_settings" className="text-primary" />
            <div className="flex flex-col flex-1 min-w-0">
              <span className="text-label-sm text-on-surface-variant">{p.badgeLabel}</span>
              <span className="text-label-md text-on-surface font-semibold truncate">
                {p.badgeName}
              </span>
            </div>
          </div>

          <form onSubmit={(e) => void handleSubmit(e)} className="space-y-5">
            <Input
              id="platform-email"
              type="email"
              label={p.email}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="username"
              disabled={submitting}
              required
              icon={<MaterialIcon name="mail" size={18} />}
            />

            <Input
              id="platform-password"
              type={showPassword ? 'text' : 'password'}
              label={p.password}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              disabled={submitting}
              required
              icon={<MaterialIcon name="lock" size={18} />}
              trailing={
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={submitting}
                  className="p-1 text-outline hover:text-primary transition-colors disabled:opacity-60"
                  aria-label={showPassword ? t.login.hidePassword : t.login.showPassword}
                >
                  <MaterialIcon name={showPassword ? 'visibility_off' : 'visibility'} size={20} />
                </button>
              }
            />

            {error && (
              <p className="text-body-sm text-error" role="alert">
                {error}
              </p>
            )}

            <Button type="submit" className="w-full" size="lg" loading={submitting}>
              {submitting ? t.login.submitting : p.submit}
            </Button>
          </form>

          <p className="mt-6 text-center text-label-sm text-on-surface-variant">
            {isPlatformPreviewEnabled() && (
              <Link to="/platform" className="text-primary font-semibold hover:underline">
                {t.platform.preview.browseWithoutLogin}
              </Link>
            )}
          </p>
        </div>
      </main>
    </div>
  )
}
