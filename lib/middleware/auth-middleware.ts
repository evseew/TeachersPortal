/**
 * Middleware для унификации авторизации в API
 * Цель: Устранить дублирование auth логики
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, hasServerRole } from '@/lib/auth/server-auth'
import { ApiErrorHandler } from './api-error-handler'

export type UserRole = 'Administrator' | 'Senior Teacher' | 'Teacher' | 'Salesman' | 'Head of Sales' | 'Regular User'

export interface AuthConfig {
  requireAuth?: boolean
  allowedRoles?: UserRole[]
  skipForMethods?: string[]
}

export interface AuthContext {
  isAuthenticated: boolean
  userRole?: UserRole
  userId?: string
}

/**
 * Универсальная проверка авторизации
 */
export async function checkAuth(config: AuthConfig = {}): Promise<{
  success: boolean
  context?: AuthContext
  response?: NextResponse
}> {
  const {
    requireAuth: requireAuthFlag = true,
    allowedRoles = [],
    skipForMethods = []
  } = config

  try {
    // Проверяем нужна ли авторизация
    if (!requireAuthFlag) {
      return { success: true }
    }

    // Проверяем базовую авторизацию
    const authError = await requireAuth()
    if (authError) {
      return {
        success: false,
        response: authError
      }
    }

    // Проверяем роли если указаны
    if (allowedRoles.length > 0) {
      const hasPermission = await hasServerRole(allowedRoles)
      if (!hasPermission) {
        return {
          success: false,
          response: ApiErrorHandler.handleError(
            ApiErrorHandler.permissionError(`Доступ разрешен только для ролей: ${allowedRoles.join(', ')}`),
            'auth-middleware'
          )
        }
      }
    }

    // TODO: Получить контекст пользователя из сессии
    const context: AuthContext = {
      isAuthenticated: true,
      // userRole: получить из сессии
      // userId: получить из сессии
    }

    return {
      success: true,
      context
    }

  } catch (error) {
    return {
      success: false,
      response: ApiErrorHandler.handleError(error, 'auth-middleware')
    }
  }
}

/**
 * Middleware HOC для API роутов с авторизацией
 */
export function withAuth(config: AuthConfig = {}) {
  return function <T extends (...args: any[]) => any>(handler: T): T {
    return (async (...args: any[]) => {
      const request = args[0] as NextRequest
      
      // Пропускаем проверку для определенных методов
      if (config.skipForMethods?.includes(request.method)) {
        return handler(...args)
      }

      const authResult = await checkAuth(config)
      
      if (!authResult.success) {
        return authResult.response
      }

      // Добавляем контекст авторизации в аргументы
      if (authResult.context) {
        // TODO: Можно добавить контекст в request или передать отдельным параметром
      }

      return handler(...args)
    }) as T
  }
}

/**
 * Предконфигурированные middleware для разных ролей
 */

export const withAdminAuth = withAuth({
  requireAuth: true,
  allowedRoles: ['Administrator']
})

export const withTeacherAuth = withAuth({
  requireAuth: true,
  allowedRoles: ['Administrator', 'Senior Teacher', 'Teacher']
})

export const withSeniorTeacherAuth = withAuth({
  requireAuth: true,
  allowedRoles: ['Administrator', 'Senior Teacher']
})

export const withManagerAuth = withAuth({
  requireAuth: true,
  allowedRoles: ['Administrator', 'Head of Sales']
})

export const withSalesAuth = withAuth({
  requireAuth: true,
  allowedRoles: ['Administrator', 'Head of Sales', 'Salesman']
})

/**
 * Middleware только для проверки авторизации без ролей
 */
export const withBasicAuth = withAuth({
  requireAuth: true,
  allowedRoles: []
})

/**
 * Опциональная авторизация (для публичных API с дополнительными функциями для авторизованных)
 */
export const withOptionalAuth = withAuth({
  requireAuth: false,
  allowedRoles: []
})

/**
 * Вспомогательная функция для динамической проверки роли
 */
export async function hasRole(role: UserRole | UserRole[]): Promise<boolean> {
  try {
    const roles = Array.isArray(role) ? role : [role]
    return await hasServerRole(roles)
  } catch (error) {
    console.error('Error checking role:', error)
    return false
  }
}

/**
 * Получение информации о текущем пользователе
 */
export async function getCurrentUser(): Promise<AuthContext | null> {
  try {
    // TODO: Реализовать получение пользователя из сессии
    const authError = await requireAuth()
    if (authError) {
      return null
    }

    return {
      isAuthenticated: true,
      // userRole: получить из сессии
      // userId: получить из сессии
    }
  } catch (error) {
    console.error('Error getting current user:', error)
    return null
  }
}
