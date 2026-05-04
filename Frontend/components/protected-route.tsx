"use client"

import { useAuth } from '@/lib/context/auth-context'
import { useRole, UserRole } from '@/hooks/use-role'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

interface ProtectedRouteProps {
  children: React.ReactNode
  requiredRoles?: UserRole[]
  fallback?: React.ReactNode
  redirectTo?: string
}

export default function ProtectedRoute({ 
  children, 
  requiredRoles, 
  fallback = <div>Access Denied</div>,
  redirectTo = '/'
}: ProtectedRouteProps) {
  const { isAuthenticated, isLoading } = useAuth()
  const { canAccess } = useRole()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/')
    }
  }, [isAuthenticated, isLoading, router])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-emerald-500"></div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return null
  }

  if (requiredRoles && !canAccess(requiredRoles)) {
    return <>{fallback}</>
  }

  return <>{children}</>
}
