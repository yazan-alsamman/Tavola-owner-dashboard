import { Badge } from '@/components/ui/Badge'
import { useLocale } from '@/context/LocaleContext'
import { platformStatusLabelKey, platformStatusTone } from '@/platform/ui/statusTone'

export function PlatformStatusBadge({
  status,
  deletedAt,
}: {
  status?: string | null
  deletedAt?: string | null
}) {
  const { t } = useLocale()
  const key = platformStatusLabelKey(status ?? undefined, deletedAt)
  return (
    <Badge tone={platformStatusTone(status ?? undefined, deletedAt)} dot>
      {t.platform.status[key]}
    </Badge>
  )
}
