import { cn } from '@/lib/utils'
import { MaterialIcon } from '@/components/ui/Icon'

interface DataTableProps {
  children: React.ReactNode
  className?: string
  /** Removes the outer card chrome when the table already sits inside a Card. */
  bare?: boolean
}

/**
 * Separation comes from whitespace and hairlines rather than a grid of borders.
 * The scroll container owns the rounding so sticky headers clip correctly.
 */
export function DataTable({ children, className, bare = false }: DataTableProps) {
  return (
    <div
      className={cn(
        'overflow-x-auto',
        !bare &&
          'rounded-xl border border-outline-variant/60 bg-surface-container-lowest elev-1',
        className,
      )}
    >
      <table className="w-full text-body-md border-separate border-spacing-0">{children}</table>
    </div>
  )
}

export function DataTableHead({ children }: { children: React.ReactNode }) {
  return <thead>{children}</thead>
}

interface DataTableHeaderProps {
  children: React.ReactNode
  className?: string
  align?: 'start' | 'end' | 'center'
  /** Right-aligns and applies tabular figures for numeric columns. */
  numeric?: boolean
  sortable?: boolean
  sortDirection?: 'asc' | 'desc' | null
  onSort?: () => void
}

export function DataTableHeader({
  children,
  className,
  align,
  numeric = false,
  sortable = false,
  sortDirection = null,
  onSort,
}: DataTableHeaderProps) {
  const resolvedAlign = align ?? (numeric ? 'end' : 'start')

  return (
    <th
      scope="col"
      aria-sort={
        sortable ? (sortDirection === 'asc' ? 'ascending' : sortDirection === 'desc' ? 'descending' : 'none') : undefined
      }
      className={cn(
        'sticky top-0 z-10 bg-surface-container-low/95 backdrop-blur',
        'border-b border-outline-variant/60',
        'px-5 py-3 text-overline text-on-surface-variant whitespace-nowrap align-middle',
        resolvedAlign === 'end' && 'text-end',
        resolvedAlign === 'center' && 'text-center',
        resolvedAlign === 'start' && 'text-start',
        className,
      )}
    >
      {sortable ? (
        <button
          type="button"
          onClick={onSort}
          className={cn(
            'inline-flex items-center gap-1 text-overline text-on-surface-variant',
            'transition-colors duration-[var(--duration-fast)] hover:text-on-surface',
            'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary rounded-sm',
            resolvedAlign === 'end' && 'flex-row-reverse',
          )}
        >
          {children}
          <MaterialIcon
            name={sortDirection === 'asc' ? 'expand_less' : 'expand_more'}
            size={14}
            className={cn(
              'transition-opacity duration-[var(--duration-fast)]',
              sortDirection ? 'opacity-100 text-primary' : 'opacity-35',
            )}
          />
        </button>
      ) : (
        children
      )}
    </th>
  )
}

export function DataTableBody({ children }: { children: React.ReactNode }) {
  return <tbody>{children}</tbody>
}

interface DataTableRowProps {
  children: React.ReactNode
  onClick?: () => void
  className?: string
  selected?: boolean
}

export function DataTableRow({ children, onClick, className, selected = false }: DataTableRowProps) {
  return (
    <tr
      className={cn(
        'group transition-colors duration-[var(--duration-fast)]',
        '[&>td]:border-b [&>td]:border-outline-variant/40',
        '[&:last-child>td]:border-b-0',
        selected ? 'bg-primary-subtle' : 'hover:bg-surface-container-low/70',
        onClick && 'cursor-pointer',
        className,
      )}
      onClick={onClick}
      aria-selected={selected || undefined}
    >
      {children}
    </tr>
  )
}

interface DataTableCellProps {
  children: React.ReactNode
  className?: string
  numeric?: boolean
  /** Secondary data — de-emphasised so the primary column leads. */
  muted?: boolean
  /** Allows long text to wrap instead of widening the table. */
  wrap?: boolean
}

export function DataTableCell({
  children,
  className,
  numeric = false,
  muted = false,
  wrap = false,
}: DataTableCellProps) {
  return (
    <td
      className={cn(
        'px-5 py-3.5 align-middle',
        muted ? 'text-on-surface-variant' : 'text-on-surface',
        numeric && 'text-end nums',
        wrap ? 'whitespace-normal' : 'whitespace-nowrap',
        className,
      )}
    >
      {children}
    </td>
  )
}

/** Full-width row for empty or error content inside a table body. */
export function DataTableMessageRow({
  colSpan,
  children,
}: {
  colSpan: number
  children: React.ReactNode
}) {
  return (
    <tr>
      <td colSpan={colSpan} className="p-0">
        {children}
      </td>
    </tr>
  )
}
