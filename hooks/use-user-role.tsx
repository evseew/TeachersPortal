"use client"

import { useSession } from "next-auth/react"
import { type UserRole } from "@/lib/constants/user-management"
import { hasAccess, isReadOnlyAccess, getAccessibleModules } from "@/lib/auth/permissions"

/**
 * Hook для работы с ролями пользователя
 */
export function useUserRole() {
  const { data: session, status } = useSession()
  const userRole = session?.user?.role as UserRole | undefined

  return {
    // Базовая информация
    userRole,
    isLoading: status === "loading",
    isAuthenticated: status === "authenticated",
    
    // Проверки доступа
    hasAccess: (path: string) => hasAccess(userRole, path),
    isReadOnlyAccess: (path: string) => isReadOnlyAccess(userRole, path),
    getAccessibleModules: () => getAccessibleModules(userRole),
    
    // Проверки конкретных ролей
    isAdmin: userRole === "Administrator",
    isSeniorTeacher: userRole === "Senior Teacher",
    isTeacher: userRole === "Teacher",
    isSalesman: userRole === "Salesman",
    isHeadOfSales: userRole === "Head of Sales",
    isRegularUser: userRole === "Regular User",
    
    // Проверки групп ролей
    isTeacherRole: userRole === "Teacher" || userRole === "Senior Teacher",
    canInputKPI: userRole === "Administrator" || userRole === "Senior Teacher",
    canViewSystem: userRole === "Administrator" || userRole === "Head of Sales",
    canManageUsers: userRole === "Administrator",
    canViewRating: userRole !== "Regular User" && userRole !== undefined,
  }
}

/**
 * Компонент для условного рендера на основе ролей
 */
interface RoleGuardProps {
  children: React.ReactNode
  allowedRoles?: UserRole[]
  requiredPath?: string
  fallback?: React.ReactNode
}

export function RoleGuard({ 
  children, 
  allowedRoles, 
  requiredPath, 
  fallback = null 
}: RoleGuardProps) {
  const { userRole, hasAccess: checkAccess } = useUserRole()
  
  // Если указаны разрешенные роли, проверяем их
  if (allowedRoles) {
    if (!userRole || !allowedRoles.includes(userRole)) {
      return <>{fallback}</>
    }
  }
  
  // Если указан путь, проверяем доступ к нему
  if (requiredPath) {
    if (!checkAccess(requiredPath)) {
      return <>{fallback}</>
    }
  }
  
  return <>{children}</>
}
