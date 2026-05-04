import { useAuth } from '@/lib/context/auth-context'

export type UserRole = 'admin' | 'super_admin' | 'warehouse_manager' | 'room_person'

export const useRole = () => {
  const { user } = useAuth()

  const hasRole = (role: UserRole | UserRole[]): boolean => {
    if (!user?.role) return false
    
    if (Array.isArray(role)) {
      return role.includes(user.role as UserRole)
    }
    
    return user.role === role
  }

  const hasAnyRole = (roles: UserRole[]): boolean => {
    if (!user?.role) return false
    return roles.includes(user.role as UserRole)
  }

  const isAdmin = (): boolean => {
    return hasRole(['admin', 'super_admin'])
  }

  const isSuperAdmin = (): boolean => {
    return hasRole('super_admin')
  }

  const isWarehouseManager = (): boolean => {
    return hasRole('warehouse_manager')
  }

  const isRoomPerson = (): boolean => {
    return hasRole('room_person')
  }

  const canAccess = (requiredRoles: UserRole[]): boolean => {
    return hasAnyRole(requiredRoles)
  }

  return {
    user,
    role: user?.role as UserRole | undefined,
    hasRole,
    hasAnyRole,
    isAdmin,
    isSuperAdmin,
    isWarehouseManager,
    isRoomPerson,
    canAccess,
  }
}
