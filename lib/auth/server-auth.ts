import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth/config"
import { type UserRole } from "@/lib/constants/user-management"
import { NextResponse } from "next/server"

/**
 * Получает сессию пользователя на сервере
 */
export async function getServerUserSession() {
  return await getServerSession(authOptions)
}

/**
 * Получает роль пользователя из сессии
 */
export async function getServerUserRole(): Promise<UserRole | null> {
  const session = await getServerUserSession()
  return (session?.user?.role as UserRole) || null
}

/**
 * Проверяет, имеет ли пользователь одну из разрешенных ролей
 */
export async function hasServerRole(allowedRoles: UserRole[]): Promise<boolean> {
  const userRole = await getServerUserRole()
  return userRole !== null && allowedRoles.includes(userRole)
}

/**
 * Middleware для защиты API endpoints по ролям
 */
export function requireRole(allowedRoles: UserRole[]) {
  return async function(handler: Function) {
    return async function(request: Request, context?: any) {
      try {
        const hasPermission = await hasServerRole(allowedRoles)
        
        if (!hasPermission) {
          const userRole = await getServerUserRole()
          return NextResponse.json(
            { 
              error: "Недостаточно прав доступа",
              required: allowedRoles,
              current: userRole
            }, 
            { status: 403 }
          )
        }
        
        return await handler(request, context)
      } catch (error) {
        console.error("Ошибка проверки роли:", error)
        return NextResponse.json(
          { error: "Ошибка авторизации" }, 
          { status: 500 }
        )
      }
    }
  }
}

/**
 * Проверяет авторизацию пользователя (наличие сессии)
 */
export async function requireAuth() {
  const session = await getServerUserSession()
  
  if (!session?.user?.email) {
    return NextResponse.json(
      { error: "Требуется авторизация" }, 
      { status: 401 }
    )
  }
  
  return null // Null означает успешную авторизацию
}

/**
 * Утилита для быстрой проверки конкретных ролей
 */
export const RoleCheckers = {
  isAdmin: () => hasServerRole(["Administrator"]),
  canManageUsers: () => hasServerRole(["Administrator"]),
  canInputKPI: () => hasServerRole(["Administrator", "Senior Teacher"]),
  canViewSystem: () => hasServerRole(["Administrator", "Head of Sales"]),
  canViewRating: () => hasServerRole(["Administrator", "Senior Teacher", "Teacher", "Salesman", "Head of Sales"]),
}
