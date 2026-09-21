import { cn } from '@/lib/utils'
import type { HTMLAttributes } from 'react'

export type BadgeTone = 'neutral' | 'brand' | 'success' | 'warning' | 'danger' | 'info'

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone
  /** `subtle` for status in dense lists, `solid` for counts, `outline` for metadata. */
  variant?: 'subtle' | 'solid' | 'outline'
  size?: 'sm' | 'md'
  /** Leading dot — helps status read without relying on colour alone. */
  dot?: boolean
}

/**
 * Subtle tones pair a low-chroma fill with a darkened text colour so every
 * status meets contrast requirements in both themes.
 */
const subtleTones: Record<BadgeTone, string> = {
  neutral: 'bg-surface-container-high text-on-surface-variant border-outline-variant/70',
  brand: 'bg-primary-subtle text-primary border-primary-border',
  success: 'bg-success-subtle text-on-success-subtle border-success-border',
  warning: 'bg-warning-subtle text-on-warning-subtle border-warning-border',
  danger: 'bg-danger-subtle text-on-danger-subtle border-danger-border',
  info: 'bg-info-subtle text-on-info-subtle border-info-border',
}

const solidTones: Record<BadgeTone, string> = {
  neutral: 'bg-inverse-surface text-inverse-on-surface border-transparent',
  brand: 'bg-primary text-on-primary border-transparent',
  success: 'bg-success text-on-primary border-transparent',
  warning: 'bg-warning text-on-warning-subtle border-transparent',
  danger: 'bg-error text-on-error border-transparent',
  info: 'bg-info text-on-primary border-transparent',
}

const outlineTones: Record<BadgeTone, string> = {
  neutral: 'bg-transparent text-on-surface-variant border-outline-variant',
  brand: 'bg-transparent text-primary border-primary-border',
  success: 'bg-transparent text-on-success-subtle border-success-border',
  warning: 'bg-transparent text-on-warning-subtle border-warning-border',
  danger: 'bg-transparent text-on-danger-subtle border-danger-border',
  info: 'bg-transparent text-on-info-subtle border-info-border',
}

const dotTones: Record<BadgeTone, string> = {
  neutral: 'bg-outline',
  brand: 'bg-primary',
  success: 'bg-success',
  warning: 'bg-warning',
  danger: 'bg-danger',
  info: 'bg-info',
}

export function Badge({
  tone = 'neutral',
  variant = 'subtle',
  size = 'md',
  dot = false,
  className,
  children,
  ...props
}: BadgeProps) {
  const toneClass =
    variant === 'solid'
      ? solidTones[tone]
      : variant === 'outline'
        ? outlineTones[tone]
        : subtleTones[tone]

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-md border font-semibold whitespace-nowrap',
        size === 'sm' ? 'h-5 px-1.5 text-label-sm' : 'h-6 px-2 text-label-sm',
        toneClass,
        className,
      )}
      {...props}
    >
      {dot && <span className={cn('h-1.5 w-1.5 rounded-full shrink-0', dotTones[tone])} />}
      {children}
    </span>
  )
}
