import { useEffect, useId, useRef, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { MaterialIcon } from '@/components/ui/Icon'
import { cn } from '@/lib/utils'

export interface ActionMenuItem {
  id: string
  label: string
  icon?: string
  onClick: () => void
  disabled?: boolean
  danger?: boolean
}

export function ActionMenu({
  label,
  items,
  disabled = false,
}: {
  label: string
  items: ActionMenuItem[]
  disabled?: boolean
}) {
  const menuId = useId()
  const rootRef = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const visible = items.filter((item) => item.label)

  useEffect(() => {
    if (!open) return
    const onPointer = (event: MouseEvent): void => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    const onKey = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  if (visible.length === 0) return null

  return (
    <div ref={rootRef} className="relative inline-flex">
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        disabled={disabled}
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((current) => !current)}
      >
        <MaterialIcon name="more_vert" size={18} />
      </Button>
      {open && (
        <ul
          id={menuId}
          role="menu"
          className="absolute end-0 z-50 mt-1 min-w-[12rem] overflow-hidden rounded-xl border border-outline-variant/70 bg-surface-container-lowest py-1 elev-3"
        >
          {visible.map((item) => (
            <li key={item.id} role="none">
              <button
                type="button"
                role="menuitem"
                disabled={item.disabled}
                className={cn(
                  'flex w-full items-center gap-2 px-3 py-2 text-start text-label-md',
                  item.danger ? 'text-error hover:bg-error-container/40' : 'text-on-surface hover:bg-surface-container-high',
                  'disabled:pointer-events-none disabled:opacity-45',
                )}
                onClick={() => {
                  setOpen(false)
                  item.onClick()
                }}
              >
                {item.icon ? <MaterialIcon name={item.icon} size={16} /> : null}
                {item.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
