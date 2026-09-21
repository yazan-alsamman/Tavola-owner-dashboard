import { cn } from '@/lib/utils'
import type { ButtonHTMLAttributes } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline'
  size?: 'sm' | 'md' | 'lg' | 'icon' | 'icon-sm'
  /** Shows a spinner, blocks interaction, and keeps the label for context. */
  loading?: boolean
}

/**
 * Hover lifts, active presses, text colour stays constant across states.
 * Elevation is reserved for the primary action so one button per view leads.
 */
const variants = {
  primary:
    'bg-primary text-on-primary elev-1 hover:bg-primary-hover hover:elev-2 active:bg-primary-active active:elev-0',
  secondary:
    'bg-secondary-container text-on-secondary-container hover:bg-secondary-container-hover active:bg-secondary-container-hover',
  ghost:
    'text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface active:bg-surface-container-highest',
  danger: 'bg-error text-on-error elev-1 hover:bg-error-hover hover:elev-2 active:elev-0',
  outline:
    'border border-outline-variant bg-surface-container-lowest text-on-surface hover:bg-surface-container-low hover:border-outline active:bg-surface-container',
}

const sizes = {
  sm: 'h-8 px-3 text-label-md gap-1.5',
  md: 'h-10 px-4 text-label-lg gap-2',
  lg: 'h-12 px-6 text-body-lg font-semibold gap-2',
  icon: 'h-10 w-10',
  'icon-sm': 'h-8 w-8',
}

function Spinner({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        'h-4 w-4 shrink-0 rounded-full border-2 border-current border-t-transparent animate-spin',
        className,
      )}
      aria-hidden="true"
    />
  )
}

export function Button({
  className,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled,
  children,
  ...props
}: ButtonProps) {
  const isIcon = size === 'icon' || size === 'icon-sm'

  return (
    <button
      className={cn(
        'relative inline-flex items-center justify-center rounded-lg font-semibold select-none',
        'transition-[background-color,border-color,box-shadow,color] duration-[var(--duration-fast)] ease-[var(--ease-standard)]',
        'active:translate-y-px',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary',
        'disabled:opacity-45 disabled:pointer-events-none disabled:elev-0',
        variants[variant],
        sizes[size],
        className,
      )}
      disabled={disabled ?? loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading && <Spinner className={isIcon ? undefined : '-ms-0.5'} />}
      {isIcon && loading ? null : children}
    </button>
  )
}
