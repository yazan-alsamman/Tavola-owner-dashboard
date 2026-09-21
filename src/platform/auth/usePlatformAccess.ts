import { useAuth } from '@/context/AuthContext'
import { isPlatformActor } from '@/types/auth'

export function usePlatformAccess() {
  const { user, isAuthenticated } = useAuth()
  const canQuery = isAuthenticated && isPlatformActor(user?.actorType)
  const canMutate = isAuthenticated && user?.actorType === 'PlatformAdmin'
  return { user, canQuery, canMutate }
}
