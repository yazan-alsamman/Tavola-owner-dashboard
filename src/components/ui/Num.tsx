import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

/** Western numerals (0–9) in Arabic RTL layouts */
export function Num({
  children,
  className,
  title,
}: {
  children: ReactNode
  className?: string
  title?: string
}) {
  return (
    <span dir="ltr" lang="en" title={title} className={cn('inline-block tabular-nums', className)}>
      {children}
    </span>
  )
}
