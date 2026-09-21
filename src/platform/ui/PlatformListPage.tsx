import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { ErrorState } from '@/components/ui/ErrorState'
import { SkeletonTable } from '@/components/ui/Skeleton'
import { useLocale } from '@/context/LocaleContext'

export function PlatformListPage({
  title,
  subtitle,
  headerActions,
  filters,
  canQuery,
  loading,
  hasRows,
  error,
  onRetry,
  emptyIcon,
  emptyTitle,
  emptyBody,
  emptyAction,
  children,
}: {
  title: string
  subtitle: string
  headerActions?: ReactNode
  filters?: ReactNode
  canQuery: boolean
  loading: boolean
  hasRows: boolean
  error: string | null
  onRetry: () => void
  emptyIcon: string
  emptyTitle: string
  emptyBody: string
  emptyAction?: ReactNode
  children: ReactNode
}) {
  const { t } = useLocale()
  const navigate = useNavigate()
  const c = t.platform.common

  return (
    <div className="space-y-6">
      <PageHeader
        className="mb-0"
        title={title}
        subtitle={subtitle}
        icon={emptyIcon}
        actions={headerActions}
      />

      {!canQuery ? (
        <Card padding="none">
          <EmptyState
            icon="lock"
            title={c.needAuthTitle}
            description={c.needAuthBody}
            action={
              <Button onClick={() => navigate('/platform/login')}>
                {t.platform.preview.signIn}
              </Button>
            }
          />
        </Card>
      ) : (
        <>
          {filters}

          {error && !loading && (
            <Card padding="none">
              <ErrorState
                title={c.errorTitle}
                description={c.errorBody}
                detail={error}
                retryLabel={t.common.retry}
                onRetry={onRetry}
              />
            </Card>
          )}

          {loading && !hasRows && <SkeletonTable />}

          {!loading && !error && !hasRows && (
            <Card padding="none">
              <EmptyState
                icon={emptyIcon}
                title={emptyTitle}
                description={emptyBody}
                action={emptyAction}
              />
            </Card>
          )}

          {hasRows && children}
        </>
      )}
    </div>
  )
}
