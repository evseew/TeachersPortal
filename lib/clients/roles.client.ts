/**
 * Типизированный API клиент для работы с ролями
 */

import { type Role, type CreateRoleRequest, type UpdateRoleRequest } from "../types/roles"

export interface RolesApiOptions {
  signal?: AbortSignal
  timeout?: number
}

export class RolesApiClient {
  private baseUrl: string

  constructor(baseUrl = '') {
    this.baseUrl = baseUrl
  }

  /**
   * Получает список всех ролей
   */
  async listRoles(options: RolesApiOptions = {}): Promise<Role[]> {
    try {
      const response = await fetch(`${this.baseUrl}/api/system/roles`, {
        cache: "no-store",
        signal: options.signal,
        headers: {
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error(`Failed to load roles (${response.status})`)
      }

      const data = await response.json()
      return data as Role[]

    } catch (error: any) {
      console.error('RolesApiClient: Error listing roles:', error)
      throw error
    }
  }

  /**
   * Получает роль по ID
   */
  async getRole(id: string, options: RolesApiOptions = {}): Promise<Role> {
    try {
      const response = await fetch(`${this.baseUrl}/api/system/roles/${id}`, {
        cache: "no-store",
        signal: options.signal,
        headers: {
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Role not found')
        }
        throw new Error(`Failed to load role (${response.status})`)
      }

      const data = await response.json()
      return data as Role

    } catch (error: any) {
      console.error('RolesApiClient: Error getting role:', error)
      throw error
    }
  }

  /**
   * Создает новую роль
   */
  async createRole(
    roleData: CreateRoleRequest,
    options: RolesApiOptions = {}
  ): Promise<Role> {
    try {
      const response = await fetch(`${this.baseUrl}/api/system/roles`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(roleData),
        signal: options.signal
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData?.error ?? `Failed to create role (${response.status})`)
      }

      const data = await response.json()
      return data as Role

    } catch (error: any) {
      console.error('RolesApiClient: Error creating role:', error)
      throw error
    }
  }

  /**
   * Обновляет роль
   */
  async updateRole(
    id: string,
    updates: Omit<UpdateRoleRequest, 'id'>,
    options: RolesApiOptions = {}
  ): Promise<Role> {
    try {
      const response = await fetch(`${this.baseUrl}/api/system/roles/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(updates),
        signal: options.signal
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData?.error ?? `Failed to update role (${response.status})`)
      }

      const data = await response.json()
      return data as Role

    } catch (error: any) {
      console.error('RolesApiClient: Error updating role:', error)
      throw error
    }
  }

  /**
   * Удаляет роль
   */
  async deleteRole(id: string, options: RolesApiOptions = {}): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/api/system/roles/${id}`, {
        method: "DELETE",
        signal: options.signal
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData?.error ?? `Failed to delete role (${response.status})`)
      }

    } catch (error: any) {
      console.error('RolesApiClient: Error deleting role:', error)
      throw error
    }
  }

  /**
   * Получает статистику использования ролей
   */
  async getRoleStats(options: RolesApiOptions = {}): Promise<{
    total: number
    system: number
    custom: number
    mostUsed: { role: string; count: number }[]
  }> {
    try {
      const roles = await this.listRoles(options)
      
      const total = roles.length
      const system = roles.filter(r => r.is_system).length
      const custom = total - system

      // TODO: Добавить подсчет использования ролей пользователями
      const mostUsed: { role: string; count: number }[] = []

      return {
        total,
        system,
        custom,
        mostUsed
      }

    } catch (error: any) {
      console.error('RolesApiClient: Error getting role stats:', error)
      throw error
    }
  }
}

// Singleton instance для удобства
export const rolesApi = new RolesApiClient()

// Backward compatibility функции (для постепенной миграции)
export async function listRoles(): Promise<Role[]> {
  return rolesApi.listRoles()
}

export async function createRole(roleData: CreateRoleRequest): Promise<Role> {
  return rolesApi.createRole(roleData)
}

export async function updateRole(id: string, updates: Omit<UpdateRoleRequest, 'id'>): Promise<Role> {
  return rolesApi.updateRole(id, updates)
}

export async function deleteRole(id: string): Promise<void> {
  return rolesApi.deleteRole(id)
}
