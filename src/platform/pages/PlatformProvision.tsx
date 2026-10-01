import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { provisionRestaurantOwner } from '@/platform/api/platformAdmin'
import { userFacingApiError } from '@/lib/platformErrors'
import { generateSecurePassword, copyText, passwordRequirementMessage } from '@/lib/platformCredentials'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { ConfirmDialog } from '@/components/ui/Modal'
import { MaterialIcon } from '@/components/ui/Icon'
import { useLocale } from '@/context/LocaleContext'
import { useToast } from '@/context/ToastContext'
import { GeneratedSecretField } from '@/platform/ui/GeneratedSecretField'
import { usePlatformAccess } from '@/platform/auth/usePlatformAccess'

export function PlatformProvisionPage() {
  const { t } = useLocale()
  const { toast } = useToast()
  const navigate = useNavigate()
  const { canQuery, canMutate } = usePlatformAccess()
  const p = t.platform.provision
  const c = t.platform.common

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [organizationName, setOrganizationName] = useState('')
  const [termsOfService, setTermsOfService] = useState(true)
  const [privacyPolicy, setPrivacyPolicy] = useState(true)
  const [marketing, setMarketing] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [success, setSuccess] = useState<{ email: string; password: string } | null>(null)
  const passwordError = passwordRequirementMessage(password, {
    length: c.passwordNeedLength,
    uppercase: c.passwordNeedUpper,
    lowercase: c.passwordNeedLower,
    number: c.passwordNeedNumber,
    special: c.passwordNeedSpecial,
  })

  const resetForm = (): void => {
    setEmail('')
    setPassword('')
    setFirstName('')
    setLastName('')
    setOrganizationName('')
    setMarketing(false)
    setTermsOfService(true)
    setPrivacyPolicy(true)
  }

  const runProvision = async (): Promise<void> => {
    setSubmitting(true)
    try {
      await provisionRestaurantOwner({
        email: email.trim(),
        password,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        organizationName: organizationName.trim(),
        consents: {
          termsOfService,
          privacyPolicy,
          marketing,
        },
      })
      const createdEmail = email.trim()
      const createdPassword = password
      setSuccess({ email: createdEmail, password: createdPassword })
      toast('success', p.success)
      resetForm()
      setConfirmOpen(false)
    } catch (err) {
      toast('error', userFacingApiError(err, t, p.error))
    } finally {
      setSubmitting(false)
    }
  }

  if (!canQuery) {
    return (
      <div className="space-y-6">
        <PageHeader className="mb-0" title={p.title} subtitle={p.subtitle} icon="person_add" />
        <Card padding="none">
          <EmptyState
            icon="lock"
            title={t.platform.common.needAuthTitle}
            description={t.platform.common.needAuthBody}
            action={
              <Button onClick={() => navigate('/platform/login')}>{t.platform.preview.signIn}</Button>
            }
          />
        </Card>
      </div>
    )
  }

  if (success) {
    return (
      <div className="space-y-6">
        <PageHeader className="mb-0" title={p.title} subtitle={p.subtitle} icon="person_add" />
        <Card className="max-w-xl space-y-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-success-subtle text-on-success-subtle">
            <MaterialIcon name="check_circle" size={24} />
          </div>
          <h2 className="text-headline-sm text-on-surface">{p.success}</h2>
          <p className="text-body-md text-on-surface-variant">{p.successNext}</p>
          <p className="text-body-sm text-on-surface-variant">{p.subtitle}</p>
          <p className="text-label-md text-on-surface-variant">{p.loginEmail}</p>
          <p className="text-body-md font-medium text-on-surface">{success.email}</p>
          <p className="text-label-md text-on-surface-variant">{p.temporaryPassword}</p>
          <p className="font-mono text-body-md text-on-surface">{success.password}</p>
          <p className="text-body-sm text-on-surface-variant">{t.platform.common.credentialsSensitive}</p>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="secondary"
              onClick={() =>
                void copyText(`${success.email}\n${success.password}`).then((ok) => {
                  if (ok) toast('success', t.common.copied)
                })
              }
            >
              {t.platform.common.copyCredentials}
            </Button>
            <Button onClick={() => navigate('/platform/restaurants')}>{p.addRestaurant}</Button>
            <Button variant="ghost" onClick={() => setSuccess(null)} disabled={!canMutate}>
              {p.provisionAnother}
            </Button>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader className="mb-0" title={p.title} subtitle={p.subtitle} icon="person_add" />

      <Card className="max-w-xl">
        <form
          onSubmit={(e) => {
            e.preventDefault()
            if (passwordError) {
              toast('error', passwordError)
              return
            }
            setConfirmOpen(true)
          }}
          className="space-y-4"
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              label={p.firstName}
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              required
              disabled={!canMutate || submitting}
              icon={<MaterialIcon name="person" size={18} />}
            />
            <Input
              label={p.lastName}
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              required
              disabled={!canMutate || submitting}
              icon={<MaterialIcon name="person" size={18} />}
            />
          </div>
          <Input
            type="email"
            label={p.email}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={!canMutate || submitting}
            icon={<MaterialIcon name="mail" size={18} />}
          />
          <GeneratedSecretField
            label={p.password}
            hint={p.passwordHint}
            error={passwordError ?? undefined}
            value={password}
            disabled={!canMutate || submitting}
            generateLabel={t.platform.common.generatePassword}
            regenerateLabel={t.platform.common.regenerate}
            copyLabel={t.common.copy}
            copiedLabel={t.common.copied}
            onChange={setPassword}
            onGenerate={() => setPassword(generateSecurePassword())}
          />
          <Input
            label={p.organizationName}
            value={organizationName}
            onChange={(e) => setOrganizationName(e.target.value)}
            required
            disabled={!canMutate || submitting}
            icon={<MaterialIcon name="corporate_fare" size={18} />}
          />
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-body-sm text-on-surface">
              <input
                type="checkbox"
                checked={termsOfService}
                onChange={(e) => setTermsOfService(e.target.checked)}
                disabled={!canMutate || submitting}
                required
              />
              {p.termsOfService}
            </label>
            <label className="flex items-center gap-2 text-body-sm text-on-surface">
              <input
                type="checkbox"
                checked={privacyPolicy}
                onChange={(e) => setPrivacyPolicy(e.target.checked)}
                disabled={!canMutate || submitting}
                required
              />
              {p.privacyPolicy}
            </label>
            <label className="flex items-center gap-2 text-body-sm text-on-surface">
              <input
                type="checkbox"
                checked={marketing}
                onChange={(e) => setMarketing(e.target.checked)}
                disabled={!canMutate || submitting}
              />
              {p.marketing}
            </label>
          </div>
          <Button type="submit" disabled={!canMutate} loading={submitting}>
            <MaterialIcon name="person_add" size={16} />
            {p.submit}
          </Button>
        </form>
      </Card>

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => {
          if (!submitting) setConfirmOpen(false)
        }}
        onConfirm={() => {
          void runProvision()
        }}
        title={p.confirmTitle}
        message={p.confirmBody}
        confirmLabel={t.common.confirm}
        cancelLabel={t.common.cancel}
        busy={submitting}
        closeOnConfirm={false}
      />
    </div>
  )
}
