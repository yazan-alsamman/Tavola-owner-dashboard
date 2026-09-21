import { cn } from '@/lib/utils'
import type { CSSProperties, HTMLAttributes } from 'react'

type CardPadding = 'none' | 'sm' | 'md' | 'lg'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  padding?: CardPadding
  /** `interactive` adds hover affordance — only use when the whole card is clickable. */
  variant?: 'default' | 'interactive' | 'selected' | 'highlighted'
  selected?: boolean
}

const paddingClass: Record<CardPadding, string> = {
  none: '',
  sm: 'p-4',
  md: 'p-5',
  lg: 'p-6',
}

/** Exposed so CardHeader/CardFooter can bleed to the card edge at any padding. */
const paddingVar: Record<CardPadding, string> = {
  none: '0px',
  sm: '1rem',
  md: '1.25rem',
  lg: '1.5rem',
}

const variantClass = {
  default: 'border-outline-variant/60 elev-1',
  interactive:
    'border-outline-variant/60 elev-1 hover:border-primary-border hover:elev-3 cursor-pointer',
  selected: 'border-primary bg-primary-subtle elev-1',
  highlighted: 'border-primary-border elev-2',
}

export function Card({
  className,
  padding = 'md',
  variant = 'default',
  selected = false,
  style,
  children,
  ...props
}: CardProps) {
  const resolved = selected ? 'selected' : variant

  return (
    <div
      className={cn(
        'bg-surface-container-lowest rounded-xl border',
        'transition-[border-color,box-shadow] duration-[var(--duration-base)] ease-[var(--ease-standard)]',
        variantClass[resolved],
        paddingClass[padding],
        className,
      )}
      style={{ '--card-pad': paddingVar[padding], ...style } as CSSProperties}
      {...props}
    >
      {children}
    </div>
  )
}

/** Bleeds to the card edge regardless of the card's padding scale. */
export function CardHeader({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'flex items-center justify-between gap-4 border-b border-outline-variant/50 rounded-t-xl',
        'px-[var(--card-pad,1.25rem)] py-4',
        'mx-[calc(var(--card-pad,1.25rem)*-1)] mt-[calc(var(--card-pad,1.25rem)*-1)] mb-5',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  )
}

export function CardFooter({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'flex items-center justify-end gap-3 border-t border-outline-variant/50 rounded-b-xl',
        'bg-surface-container-low/40',
        'px-[var(--card-pad,1.25rem)] py-4',
        'mx-[calc(var(--card-pad,1.25rem)*-1)] mb-[calc(var(--card-pad,1.25rem)*-1)] mt-5',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  )
}

export function CardTitle({ className, children, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={cn('text-headline-sm text-on-surface flex items-center gap-2', className)}
      {...props}
    >
      {children}
    </h3>
  )
}

export function CardDescription({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p className={cn('text-body-sm text-on-surface-variant', className)} {...props}>
      {children}
    </p>
  )
}
