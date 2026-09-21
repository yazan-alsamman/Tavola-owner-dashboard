import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

/** Western numerals (0–9) in Arabic RTL layouts */
export function Num({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <span dir="ltr" lang="en" className={cn('inline-block tabular-nums', className)}>
      {children}
    </span>
  )
}
