import { MaterialIcon } from '@/components/ui/Icon'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'

interface ErrorStateProps {
  title: string
  /** What went wrong, in the user's terms. */
  description?: string
  /** Backend message or code — shown as secondary detail, never as the headline. */
  detail?: string
  retryLabel?: string
  onRetry?: () => void
  action?: React.ReactNode
  size?: 'inline' | 'page'
  className?: string
}

/**
 * Failure surface that always answers: what happened, is my data safe, what now.
 * Technical detail is kept but demoted below the human-readable explanation.
 */
export function ErrorState({
  title,
  description,
  detail,
  retryLabel = 'Try again',
  onRetry,
  action,
  size = 'inline',
  className,
}: ErrorStateProps) {
  return (
    <div
      role="alert"
      className={cn(
        'flex flex-col items-center justify-center text-center px-6',
        size === 'page' ? 'py-20' : 'py-14',
        className,
      )}
    >
      <div
        className={cn(
          'flex items-center justify-center rounded-2xl bg-danger-subtle text-on-danger-subtle',
          'ring-1 ring-danger-border/70',
          size === 'page' ? 'h-16 w-16' : 'h-12 w-12',
        )}
      >
        <MaterialIcon name="error" size={size === 'page' ? 28 : 22} />
      </div>

      <h3
        className={cn(
          'text-on-surface mt-5',
          size === 'page' ? 'text-headline-md' : 'text-headline-sm',
        )}
      >
        {title}
      </h3>

      {description && (
        <p className="text-body-md text-on-surface-variant mt-2 max-w-md leading-relaxed">
          {description}
        </p>
      )}

      {detail && (
        <p className="text-body-sm text-on-surface-variant/80 mt-3 max-w-md break-words">
          {detail}
        </p>
      )}

      {(onRetry || action) && (
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          {onRetry && (
            <Button variant="outline" size="md" onClick={onRetry}>
              <MaterialIcon name="sync" size={16} />
              {retryLabel}
            </Button>
          )}
          {action}
        </div>
      )}
    </div>
  )
}
