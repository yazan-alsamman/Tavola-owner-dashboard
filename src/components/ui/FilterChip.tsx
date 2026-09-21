import { cn } from '@/lib/utils'

interface FilterChipProps {
  label: string
  active?: boolean
  count?: number
  onClick?: () => void
}

export function FilterChip({ label, active, count, onClick }: FilterChipProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-label-md transition-all duration-200 whitespace-nowrap',
        active
          ? 'bg-primary text-on-primary shadow-md shadow-primary/20'
          : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container-high',
      )}
    >
      {label}
      {count !== undefined && count > 0 && (
        <span
          className={cn(
            'text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center',
            active ? 'bg-on-primary/20' : 'bg-primary-container/20 text-primary',
          )}
        >
          {count}
        </span>
      )}
    </button>
  )
}
