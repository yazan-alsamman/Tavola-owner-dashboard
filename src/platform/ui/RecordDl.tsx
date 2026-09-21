import { scalarEntries } from '@/platform/ui/recordFields'
import { CopyId } from '@/platform/ui/CopyId'
import { useLocale } from '@/context/LocaleContext'

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function isTechnicalKey(key: string, value: string): boolean {
  if (UUID_RE.test(value)) return true
  return /(^id$|Id$|_id$|uuid|UUID)/.test(key)
}

export function RecordDl({ record }: { record: Record<string, unknown> }) {
  const { t } = useLocale()
  const rows = scalarEntries(record)
  if (rows.length === 0) return null

  const primary = rows.filter(([key, value]) => !isTechnicalKey(key, value))
  const technical = rows.filter(([key, value]) => isTechnicalKey(key, value))
  const shown = primary.length > 0 ? primary : rows

  return (
    <div className="space-y-3">
      <dl className="grid grid-cols-1 gap-px overflow-hidden rounded-lg bg-outline-variant/40 sm:grid-cols-2">
        {shown.map(([key, value]) => (
          <div key={key} className="bg-surface-container-lowest px-3.5 py-3">
            <dt className="text-overline text-on-surface-variant">{key}</dt>
            <dd className="mt-1 break-all text-body-sm text-on-surface">{value}</dd>
          </div>
        ))}
      </dl>
      {primary.length > 0 && technical.length > 0 ? (
        <details className="rounded-lg border border-outline-variant/60 bg-surface-container-lowest px-3.5 py-2">
          <summary className="cursor-pointer text-label-md text-on-surface-variant">
            {t.platform.common.technicalDetails}
          </summary>
          <dl className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {technical.map(([key, value]) => (
              <div key={key}>
                <dt className="text-overline text-on-surface-variant">{key}</dt>
                <dd className="mt-1">
                  <CopyId value={value} copyLabel={t.common.copy} copiedLabel={t.common.copied} />
                </dd>
              </div>
            ))}
          </dl>
        </details>
      ) : null}
    </div>
  )
}
