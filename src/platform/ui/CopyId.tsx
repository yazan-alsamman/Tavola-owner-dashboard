import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { MaterialIcon } from '@/components/ui/Icon'
import { Num } from '@/components/ui/Num'

export function CopyId({
  value,
  copyLabel,
  copiedLabel,
}: {
  value: string | undefined | null
  copyLabel: string
  copiedLabel: string
}) {
  const [copied, setCopied] = useState(false)

  if (!value) return <span>—</span>

  const short = value.length > 12 ? `${value.slice(0, 8)}…` : value

  const copy = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1500)
    } catch {
      setCopied(false)
    }
  }

  return (
    <span className="inline-flex items-center gap-1">
      <Num className="font-mono text-label-sm text-on-surface-variant" title={value}>
        {short}
      </Num>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        onClick={() => void copy()}
        aria-label={copied ? copiedLabel : copyLabel}
      >
        <MaterialIcon name="content_copy" size={14} />
      </Button>
    </span>
  )
}
