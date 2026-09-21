import { Field, Input } from '@/components/ui/Input'
import { FilterBar } from '@/components/ui/FilterBar'
import type { ReactNode } from 'react'

export function DateRangeFilter({
  from,
  to,
  onFromChange,
  onToChange,
  fromLabel,
  toLabel,
  actions,
  summary,
  extra,
}: {
  from: string
  to: string
  onFromChange: (value: string) => void
  onToChange: (value: string) => void
  fromLabel: string
  toLabel: string
  actions?: ReactNode
  summary?: ReactNode
  extra?: ReactNode
}) {
  return (
    <FilterBar actions={actions} summary={summary}>
      <Field label={fromLabel} className="w-full sm:w-auto">
        <Input type="date" value={from} max={to} onChange={(e) => onFromChange(e.target.value)} />
      </Field>
      <Field label={toLabel} className="w-full sm:w-auto">
        <Input type="date" value={to} min={from} onChange={(e) => onToChange(e.target.value)} />
      </Field>
      {extra}
    </FilterBar>
  )
}
