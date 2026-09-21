import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { provisionRestaurantOwner } from '@/platform/api/platformAdmin'
import { isApiError } from '@/api/errors'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { ConfirmDialog } from '@/components/ui/Modal'
import { useLocale } from '@/context/LocaleContext'
import { useToast } from '@/context/ToastContext'
import { usePlatformAccess } from '@/platform/auth/usePlatformAccess'

export function PlatformProvisionPage() {
  const { t } = useLocale()
  const { toast } = useToast()
  const navigate = useNavigate()
  const { canQuery, canMutate } = usePlatformAccess()
  const p = t.platform.provision

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
  const [successEmail, setSuccessEmail] = useState<string | null>(null)

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
      setSuccessEmail(email.trim())
      toast('success', p.success)
      resetForm()
      setConfirmOpen(false)
    } catch (err) {
      toast('error', isApiError(err) ? err.message : p.error)
    } finally {
      setSubmitting(false)
    }
  }

  if (!canQuery) {
    return (
      <div className="space-y-6">
        <PageHeader className="mb-0" title={p.title} subtitle={p.subtitle} />
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

  if (successEmail) {
    return (
      <div className="space-y-6">
        <PageHeader className="mb-0" title={p.title} subtitle={p.subtitle} />
        <Card className="max-w-xl space-y-4">
          <h2 className="text-headline-sm text-on-surface">{p.success}</h2>
          <p className="text-body-md text-on-surface-variant">{p.successNext}</p>
          <p className="text-body-md font-medium text-on-surface">{successEmail}</p>
          <Button
            onClick={() => setSuccessEmail(null)}
            disabled={!canMutate}
          >
            {p.provisionAnother}
          </Button>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader className="mb-0" title={p.title} subtitle={p.subtitle} />

      <Card className="max-w-xl">
        <form
          onSubmit={(e) => {
            e.preventDefault()
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
            />
            <Input
              label={p.lastName}
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              required
              disabled={!canMutate || submitting}
            />
          </div>
          <Input
            type="email"
            label={p.email}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={!canMutate || submitting}
          />
          <Input
            type="password"
            label={p.password}
            hint={p.passwordHint}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            disabled={!canMutate || submitting}
            autoComplete="new-password"
          />
          <Input
            label={p.organizationName}
            value={organizationName}
            onChange={(e) => setOrganizationName(e.target.value)}
            required
            disabled={!canMutate || submitting}
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
