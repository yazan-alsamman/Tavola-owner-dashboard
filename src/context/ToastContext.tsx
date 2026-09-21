import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { MaterialIcon } from '@/components/ui/Icon'

export type ToastType = 'success' | 'error' | 'info' | 'warning'

interface Toast {
  id: string
  type: ToastType
  title: string
  message?: string
}

interface ToastContextType {
  toast: (type: ToastType, title: string, message?: string) => void
}

const ToastContext = createContext<ToastContextType | null>(null)

const icons: Record<ToastType, string> = {
  success: 'check_circle',
  error: 'cancel',
  info: 'info',
  warning: 'warning',
}

const styles = {
  success: 'border-success/30 bg-success-light',
  error: 'border-error/30 bg-error-container',
  info: 'border-primary/30 bg-primary-container/10',
  warning: 'border-warning/30 bg-warning-light',
}

const iconStyles = {
  success: 'text-success',
  error: 'text-error',
  info: 'text-primary',
  warning: 'text-warning',
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const toast = useCallback((type: ToastType, title: string, message?: string) => {
    const id = `toast-${Date.now()}`
    setToasts((prev) => [...prev, { id, type, title, message }])
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 4000)
  }, [])

  const dismiss = (id: string) => setToasts((prev) => prev.filter((t) => t.id !== id))

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed bottom-4 end-4 z-[100] flex flex-col gap-2 max-w-sm w-full pointer-events-none md:bottom-6">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={cn(
              'pointer-events-auto flex items-start gap-3 p-4 rounded-xl border shadow-elevated',
              'bg-surface-container-lowest animate-slide-up',
              styles[t.type],
            )}
            role="alert"
          >
            <MaterialIcon name={icons[t.type]} size={20} className={cn('shrink-0 mt-0.5', iconStyles[t.type])} filled />
            <div className="flex-1 min-w-0">
              <p className="text-body-md font-semibold text-on-surface">{t.title}</p>
              {t.message && <p className="text-body-sm text-on-surface-variant mt-0.5">{t.message}</p>}
            </div>
            <button
              onClick={() => dismiss(t.id)}
              className="text-outline hover:text-on-surface text-lg leading-none"
              aria-label="Dismiss"
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}
