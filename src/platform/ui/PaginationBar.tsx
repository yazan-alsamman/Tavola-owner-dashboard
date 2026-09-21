import { Button } from '@/components/ui/Button'
import { Num } from '@/components/ui/Num'

export function PaginationBar({
  page,
  pageSize,
  total,
  onPageChange,
  previousLabel,
  nextLabel,
  summaryTemplate,
}: {
  page: number
  pageSize: number
  total: number
  onPageChange: (page: number) => void
  previousLabel: string
  nextLabel: string
  /** `{from}`, `{to}`, `{total}` */
  summaryTemplate: string
}) {
  const pageCount = Math.max(1, Math.ceil(total / pageSize))
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1
  const to = Math.min(page * pageSize, total)
  const summary = summaryTemplate
    .replace('{from}', String(from))
    .replace('{to}', String(to))
    .replace('{total}', String(total))

  if (total === 0) return null

  return (
    <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
      <p className="text-body-sm text-on-surface-variant">
        <Num>{summary}</Num>
      </p>
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          {previousLabel}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={page >= pageCount}
          onClick={() => onPageChange(page + 1)}
        >
          {nextLabel}
        </Button>
      </div>
    </div>
  )
}
