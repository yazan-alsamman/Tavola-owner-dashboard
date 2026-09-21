import { Badge } from '@/components/ui/Badge'
import { MaterialIcon } from '@/components/ui/Icon'
import { useLocale } from '@/context/LocaleContext'
import {
  platformStatusIcon,
  platformStatusLabelKey,
  platformStatusTone,
} from '@/platform/ui/statusTone'

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
    <Badge tone={platformStatusTone(status ?? undefined, deletedAt)}>
      <MaterialIcon name={platformStatusIcon(key)} size={13} />
      {t.platform.status[key]}
    </Badge>
  )
}
