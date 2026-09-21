import { scalarEntries } from '@/platform/ui/recordFields'

export function RecordDl({ record }: { record: Record<string, unknown> }) {
  const rows = scalarEntries(record)
  if (rows.length === 0) return null

  return (
    <dl className="grid grid-cols-1 gap-px overflow-hidden rounded-lg bg-outline-variant/40 sm:grid-cols-2">
      {rows.map(([key, value]) => (
        <div key={key} className="bg-surface-container-lowest px-3.5 py-3">
          <dt className="text-overline text-on-surface-variant">{key}</dt>
          <dd className="mt-1 break-all text-body-sm text-on-surface">{value}</dd>
        </div>
      ))}
    </dl>
  )
}
