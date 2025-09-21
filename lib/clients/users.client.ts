/**
 * Типизированный API клиент для работы с пользователями
 * Заменяет функции из lib/api/users.ts
 */

import { UserRole, TeacherCategory } from "@/lib/constants/user-management"

export interface UserRow {
  user_id: string
  email: string
  full_name: string
  role: UserRole
  role_id: string
  category: TeacherCategory | null
  branch_id: string | null
  branch_name: string | null
  avatar_url: string | null
  permissions?: string[]
}

export interface UsersApiOptions {
  signal?: AbortSignal
  timeout?: number
}

export class UsersApiClient {
  private baseUrl: string

  constructor(baseUrl = '') {
    this.baseUrl = baseUrl
  }

  /**
   * Получает список пользователей с возможностью поиска
   */
  async listUsers(query?: string, options: UsersApiOptions = {}): Promise<UserRow[]> {
    try {
      const url = new URL(`${this.baseUrl}/api/system/users`, window.location.origin)
      if (query) url.searchParams.set("q", query)
      
      const response = await fetch(url.toString(), { 
        cache: "no-store",
        signal: options.signal,
        headers: {
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error(`Failed to load users (${response.status})`)
      }

      const data = await response.json()
      return data as UserRow[]

    } catch (error: any) {
      console.error('UsersApiClient: Error listing users:', error)
      throw error
    }
  }

  /**
   * Обновляет данные пользователя
   */
  async updateUser(
    id: string, 
    updates: Partial<Pick<UserRow, "role" | "role_id" | "category" | "branch_id">>,
    options: UsersApiOptions = {}
  ): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/api/system/users/${id}`, {
        method: "PATCH",
        headers: { 
          "Content-Type": "application/json" 
        },
        body: JSON.stringify(updates),
        signal: options.signal
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData?.error ?? `Failed to update user (${response.status})`)
      }

    } catch (error: any) {
      console.error('UsersApiClient: Error updating user:', error)
      throw error
    }
  }

  /**
   * Удаляет пользователя
   */
  async deleteUser(id: string, options: UsersApiOptions = {}): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}/api/system/users/${id}`, {
        method: "DELETE",
        signal: options.signal
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData?.error ?? `Failed to delete user (${response.status})`)
      }

      return await response.json()

    } catch (error: any) {
      console.error('UsersApiClient: Error deleting user:', error)
      throw error
    }
  }

  /**
   * Поиск пользователей по различным критериям
   */
  async searchUsers(filters: {
    role?: UserRole
    category?: TeacherCategory
    branch_id?: string
    email?: string
  }, options: UsersApiOptions = {}): Promise<UserRow[]> {
    try {
      const users = await this.listUsers(undefined, options)
      
      return users.filter(user => {
        if (filters.role && user.role !== filters.role) return false
        if (filters.category && user.category !== filters.category) return false
        if (filters.branch_id && user.branch_id !== filters.branch_id) return false
        if (filters.email && !user.email.toLowerCase().includes(filters.email.toLowerCase())) return false
        return true
      })

    } catch (error: any) {
      console.error('UsersApiClient: Error searching users:', error)
      throw error
    }
  }

  /**
   * Получает статистику пользователей
   */
  async getUserStats(options: UsersApiOptions = {}): Promise<{
    total: number
    byRole: Record<UserRole, number>
    byCategory: Record<TeacherCategory, number>
    byBranch: Record<string, number>
  }> {
    try {
      const users = await this.listUsers(undefined, options)
      
      const byRole = {} as Record<UserRole, number>
      const byCategory = {} as Record<TeacherCategory, number>
      const byBranch = {} as Record<string, number>

      users.forEach(user => {
        // Подсчет по ролям
        byRole[user.role] = (byRole[user.role] || 0) + 1
        
        // Подсчет по категориям
        if (user.category) {
          byCategory[user.category] = (byCategory[user.category] || 0) + 1
        }
        
        // Подсчет по филиалам
        if (user.branch_name) {
          byBranch[user.branch_name] = (byBranch[user.branch_name] || 0) + 1
        }
      })

      return {
        total: users.length,
        byRole,
        byCategory,
        byBranch
      }

    } catch (error: any) {
      console.error('UsersApiClient: Error getting user stats:', error)
      throw error
    }
  }
}

// Singleton instance для удобства
export const usersApi = new UsersApiClient()

// Backward compatibility функции (для постепенной миграции)
export async function listUsers(query?: string): Promise<UserRow[]> {
  return usersApi.listUsers(query)
}

export async function updateUser(id: string, updates: Partial<Pick<UserRow, "role" | "role_id" | "category" | "branch_id">>): Promise<void> {
  return usersApi.updateUser(id, updates)
}

export async function deleteUser(id: string): Promise<any> {
  return usersApi.deleteUser(id)
}
