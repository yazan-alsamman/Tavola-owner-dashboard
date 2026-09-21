import { useAuth } from '@/context/AuthContext'
import { isPlatformAdminRole } from '@/types/auth'

export function usePlatformAccess() {
  const { user, isAuthenticated } = useAuth()
  const role = user?.platformRole
  const canQuery = isAuthenticated && isPlatformAdminRole(role)
  const canMutate = isAuthenticated && role === 'PlatformAdmin'
  return { user, canQuery, canMutate, role }
}
