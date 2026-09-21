import type { BadgeTone } from '@/components/ui/Badge'

export type LifecycleAction = 'suspend' | 'reactivate' | 'delete' | 'restore'

function normalizeStatus(status: string | undefined, deletedAt?: string | null): string {
  if (deletedAt) return 'deleted'
  return (status ?? '').trim().toLowerCase()
}

export function platformStatusTone(
  status: string | undefined,
  deletedAt?: string | null,
): BadgeTone {
  const value = normalizeStatus(status, deletedAt)
  if (value === 'active' || value === 'enabled') return 'success'
  if (value === 'suspended' || value === 'disabled') return 'warning'
  if (value === 'deleted' || value === 'cancelled' || value === 'expired') return 'danger'
  if (value === 'pending') return 'info'
  return 'neutral'
}

export type StatusLabelKey =
  | 'active'
  | 'suspended'
  | 'deleted'
  | 'cancelled'
  | 'expired'
  | 'pending'
  | 'unknown'

export function platformStatusLabelKey(
  status: string | undefined,
  deletedAt?: string | null,
): StatusLabelKey {
  const value = normalizeStatus(status, deletedAt)
  if (value === 'active' || value === 'enabled') return 'active'
  if (value === 'suspended' || value === 'disabled') return 'suspended'
  if (value === 'deleted') return 'deleted'
  if (value === 'cancelled') return 'cancelled'
  if (value === 'expired') return 'expired'
  if (value === 'pending') return 'pending'
  return 'unknown'
}

export function lifecycleActionsFor(
  status: string | undefined,
  deletedAt?: string | null,
): LifecycleAction[] {
  if (deletedAt || normalizeStatus(status, deletedAt) === 'deleted') {
    return ['restore']
  }
  if (normalizeStatus(status) === 'suspended') {
    return ['reactivate', 'delete']
  }
  return ['suspend', 'delete']
}
