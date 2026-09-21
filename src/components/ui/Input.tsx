import { useId } from 'react'
import { cn } from '@/lib/utils'
import type {
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from 'react'

/** Shared control chrome so inputs, selects, and textareas are visually identical. */
const controlBase = cn(
  'w-full rounded-lg border bg-surface-container-lowest text-on-surface text-body-md',
  'placeholder:text-outline/70',
  'transition-[border-color,box-shadow,background-color] duration-[var(--duration-fast)] ease-[var(--ease-standard)]',
  'hover:border-outline',
  'focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/25',
  'disabled:cursor-not-allowed disabled:bg-surface-container-low disabled:text-on-surface-variant disabled:hover:border-outline-variant',
  'read-only:bg-surface-container-low/60 read-only:hover:border-outline-variant',
)

const controlValid = 'border-outline-variant'
const controlInvalid = 'border-error focus:border-error focus:ring-error/25 hover:border-error'

interface FieldProps {
  label?: string
  hint?: string
  error?: string
  required?: boolean
  htmlFor?: string
  /** Id applied to the hint/error message so controls can reference it. */
  messageId?: string
  className?: string
  children: ReactNode
}

/** Label / control / message stack used by every form control. */
export function Field({
  label,
  hint,
  error,
  required,
  htmlFor,
  messageId,
  className,
  children,
}: FieldProps) {
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      {label && (
        <label htmlFor={htmlFor} className="text-label-md text-on-surface-variant">
          {label}
          {required && (
            <span className="text-error ms-0.5" aria-hidden="true">
              *
            </span>
          )}
        </label>
      )}
      {children}
      {error ? (
        <p id={messageId} className="text-body-sm text-error">
          {error}
        </p>
      ) : hint ? (
        <p id={messageId} className="text-body-sm text-on-surface-variant">
          {hint}
        </p>
      ) : null}
    </div>
  )
}

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  icon?: ReactNode
  /** Trailing slot — units, counters, or a reveal/clear control. */
  trailing?: ReactNode
  label?: string
  hint?: string
  error?: string
  inputSize?: 'sm' | 'md'
}

export function Input({
  className,
  icon,
  trailing,
  label,
  hint,
  error,
  inputSize = 'md',
  id,
  required,
  ...props
}: InputProps) {
  const autoId = useId()
  const controlId = id ?? autoId
  const messageId = `${controlId}-message`
  const hasMessage = Boolean(error ?? hint)

  const control = (
    <div className="relative">
      {icon && (
        <div className="absolute inset-y-0 start-3 flex items-center pointer-events-none text-outline">
          {icon}
        </div>
      )}
      <input
        id={controlId}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={hasMessage ? messageId : undefined}
        className={cn(
          controlBase,
          inputSize === 'sm' ? 'h-9' : 'h-10',
          error ? controlInvalid : controlValid,
          icon ? 'ps-10' : 'ps-3.5',
          trailing ? 'pe-10' : 'pe-3.5',
          className,
        )}
        {...props}
      />
      {trailing && (
        <div className="absolute inset-y-0 end-2 flex items-center text-on-surface-variant">
          {trailing}
        </div>
      )}
    </div>
  )

  if (!label && !hasMessage) return control

  return (
    <Field
      label={label}
      hint={hint}
      error={error}
      required={required}
      htmlFor={controlId}
      messageId={messageId}
    >
      {control}
    </Field>
  )
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  hint?: string
  error?: string
  selectSize?: 'sm' | 'md'
}

export function Select({
  className,
  children,
  label,
  hint,
  error,
  selectSize = 'md',
  id,
  ...props
}: SelectProps) {
  const autoId = useId()
  const controlId = id ?? autoId
  const messageId = `${controlId}-message`
  const hasMessage = Boolean(error ?? hint)

  const control = (
    <select
      id={controlId}
      aria-invalid={error ? true : undefined}
      aria-describedby={hasMessage ? messageId : undefined}
      className={cn(
        controlBase,
        'select-chevron cursor-pointer appearance-none ps-3.5 pe-9',
        selectSize === 'sm' ? 'h-9' : 'h-10',
        error ? controlInvalid : controlValid,
        className,
      )}
      {...props}
    >
      {children}
    </select>
  )

  if (!label && !hasMessage) return control

  return (
    <Field label={label} hint={hint} error={error} htmlFor={controlId} messageId={messageId}>
      {control}
    </Field>
  )
}

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  hint?: string
  error?: string
}

export function Textarea({ className, label, hint, error, id, required, ...props }: TextareaProps) {
  const autoId = useId()
  const controlId = id ?? autoId
  const messageId = `${controlId}-message`
  const hasMessage = Boolean(error ?? hint)

  const control = (
    <textarea
      id={controlId}
      required={required}
      aria-invalid={error ? true : undefined}
      aria-describedby={hasMessage ? messageId : undefined}
      className={cn(
        controlBase,
        error ? controlInvalid : controlValid,
        'min-h-24 px-3.5 py-2.5 resize-y leading-relaxed',
        className,
      )}
      {...props}
    />
  )

  if (!label && !hasMessage) return control

  return (
    <Field
      label={label}
      hint={hint}
      error={error}
      required={required}
      htmlFor={controlId}
      messageId={messageId}
    >
      {control}
    </Field>
  )
}
