import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { MaterialIcon } from '@/components/ui/Icon'
import { copyText } from '@/lib/platformCredentials'

export function GeneratedSecretField({
  label,
  hint,
  error,
  value,
  disabled,
  generateLabel,
  regenerateLabel,
  copyLabel,
  copiedLabel,
  onChange,
  onGenerate,
}: {
  label: string
  hint?: string
  error?: string
  value: string
  disabled?: boolean
  generateLabel: string
  regenerateLabel: string
  copyLabel: string
  copiedLabel: string
  onChange: (value: string) => void
  onGenerate: () => void
}) {
  const [copied, setCopied] = useState(false)

  const copy = async (): Promise<void> => {
    if (!value) return
    const ok = await copyText(value)
    if (!ok) return
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1600)
  }

  return (
    <div className="space-y-2">
      <Input
        type="text"
        autoComplete="new-password"
        spellCheck={false}
        label={label}
        hint={hint}
        error={error}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        icon={<MaterialIcon name="password" size={18} />}
      />
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="secondary" size="sm" disabled={disabled} onClick={onGenerate}>
          <MaterialIcon name="autorenew" size={14} />
          {value ? regenerateLabel : generateLabel}
        </Button>
        <Button type="button" variant="outline" size="sm" disabled={disabled || !value} onClick={() => void copy()}>
          <MaterialIcon name="content_copy" size={14} />
          {copied ? copiedLabel : copyLabel}
        </Button>
      </div>
    </div>
  )
}
