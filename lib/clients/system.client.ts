/**
 * Типизированный API клиент для системных операций
 * Заменяет функции из lib/api/system.ts
 */

import type { Branch, BranchUsageInfo } from '@/lib/types/shared'
import type { SyncResult } from '@/lib/services/leaderboard-sync.service'
import type { RecomputationResult } from '@/lib/services/score-recomputation.service'

export interface SystemApiOptions {
  signal?: AbortSignal
  timeout?: number
}

export interface UserSyncResult {
  success: boolean
  results?: {
    added: number
    updated: number
    unchanged: number
    errors: string[]
  }
  leaderboardSync?: SyncResult
  error?: string
  timestamp: string
}

export interface MigrationResult {
  success: boolean
  message?: string
  error?: string
}

export class SystemApiClient {
  private baseUrl: string

  constructor(baseUrl = '') {
    this.baseUrl = baseUrl
  }

  /**
   * Синхронизация пользователей из Pyrus
   */
  async syncUsers(options: SystemApiOptions = {}): Promise<UserSyncResult> {
    try {
      const controller = new AbortController()
      const timeoutId = options.timeout 
        ? setTimeout(() => controller.abort(), options.timeout)
        : null

      const response = await fetch(`${this.baseUrl}/api/system/sync-users`, {
        method: 'POST',
        signal: options.signal || controller.signal,
        headers: {
          'Content-Type': 'application/json'
        }
      })

      if (timeoutId) clearTimeout(timeoutId)

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `User sync failed (${response.status})`)
      }

      const data = await response.json()
      return data as UserSyncResult

    } catch (error: any) {
      console.error('SystemApiClient: Error syncing users:', error)
      throw error
    }
  }

  /**
   * Пересчет рейтингов
   */
  async recomputeScores(options: SystemApiOptions = {}): Promise<RecomputationResult> {
    try {
      const response = await fetch(`${this.baseUrl}/api/system/recompute-scores`, {
        method: 'POST',
        signal: options.signal,
        headers: {
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `Score recomputation failed (${response.status})`)
      }

      const data = await response.json()
      
      return {
        executed: true,
        reason: data.message || 'Scores recomputed successfully',
        timestamp: new Date().toISOString()
      }

    } catch (error: any) {
      console.error('SystemApiClient: Error recomputing scores:', error)
      throw error
    }
  }

  /**
   * Запуск миграции
   */
  async runMigration(options: SystemApiOptions = {}): Promise<MigrationResult> {
    try {
      const response = await fetch(`${this.baseUrl}/api/system/run-migration`, {
        method: 'POST',
        signal: options.signal,
        headers: {
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `Migration failed (${response.status})`)
      }

      const data = await response.json()
      return data as MigrationResult

    } catch (error: any) {
      console.error('SystemApiClient: Error running migration:', error)
      throw error
    }
  }

  /**
   * Получение списка филиалов
   */
  async listBranches(options: SystemApiOptions = {}): Promise<Branch[]> {
    try {
      const response = await fetch(`${this.baseUrl}/api/system/branches`, {
        cache: 'no-store',
        signal: options.signal,
        headers: {
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error(`Failed to load branches (${response.status})`)
      }

      const data = await response.json()
      
      if (!Array.isArray(data)) {
        throw new Error('Invalid branches data structure')
      }

      return data as Branch[]

    } catch (error: any) {
      console.error('SystemApiClient: Error loading branches:', error)
      throw error
    }
  }

  /**
   * Создание филиала
   */
  async createBranch(name: string, options: SystemApiOptions = {}): Promise<Branch> {
    try {
      const response = await fetch(`${this.baseUrl}/api/system/branches`, {
        method: 'POST',
        signal: options.signal,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name })
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `Failed to create branch (${response.status})`)
      }

      const data = await response.json()
      return data as Branch

    } catch (error: any) {
      console.error('SystemApiClient: Error creating branch:', error)
      throw error
    }
  }

  /**
   * Обновление филиала
   */
  async updateBranch(id: string, name: string, options: SystemApiOptions = {}): Promise<Branch> {
    try {
      const response = await fetch(`${this.baseUrl}/api/system/branches/${id}`, {
        method: 'PATCH',
        signal: options.signal,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name })
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `Failed to update branch (${response.status})`)
      }

      const data = await response.json()
      return data as Branch

    } catch (error: any) {
      console.error('SystemApiClient: Error updating branch:', error)
      throw error
    }
  }

  /**
   * Удаление филиала
   */
  async deleteBranch(id: string, options: SystemApiOptions = {}): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/api/system/branches/${id}`, {
        method: 'DELETE',
        signal: options.signal,
        headers: {
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `Failed to delete branch (${response.status})`)
      }

    } catch (error: any) {
      console.error('SystemApiClient: Error deleting branch:', error)
      throw error
    }
  }

  /**
   * Проверка использования филиала
   */
  async checkBranchUsage(id: string, options: SystemApiOptions = {}): Promise<BranchUsageInfo> {
    try {
      const response = await fetch(`${this.baseUrl}/api/system/branches/${id}/check-usage`, {
        cache: 'no-store',
        signal: options.signal,
        headers: {
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error(`Failed to check branch usage (${response.status})`)
      }

      const data = await response.json()
      return data as BranchUsageInfo

    } catch (error: any) {
      console.error('SystemApiClient: Error checking branch usage:', error)
      throw error
    }
  }

  /**
   * Получение системной статистики
   */
  async getSystemStats(options: SystemApiOptions = {}): Promise<{
    totalUsers: number
    totalBranches: number
    totalTeachers: number
    systemHealth: 'healthy' | 'warning' | 'error'
  }> {
    try {
      // Параллельные запросы для статистики
      const [branches] = await Promise.all([
        this.listBranches(options)
      ])

      // TODO: Добавить эндпоинт для получения статистики пользователей
      return {
        totalUsers: 0, // Заглушка
        totalBranches: branches.length,
        totalTeachers: 0, // Заглушка
        systemHealth: 'healthy'
      }

    } catch (error: any) {
      console.error('SystemApiClient: Error getting system stats:', error)
      return {
        totalUsers: 0,
        totalBranches: 0,
        totalTeachers: 0,
        systemHealth: 'error'
      }
    }
  }

  /**
   * Проверка здоровья системы
   */
  async healthCheck(options: SystemApiOptions = {}): Promise<{
    status: 'ok' | 'error'
    timestamp: string
    checks: Array<{ name: string; status: 'ok' | 'error'; message?: string }>
  }> {
    try {
      const startTime = Date.now()
      const checks: Array<{ name: string; status: 'ok' | 'error'; message?: string }> = []

      // Проверка API филиалов
      try {
        await this.listBranches(options)
        checks.push({ name: 'branches_api', status: 'ok' })
      } catch (error: any) {
        checks.push({ 
          name: 'branches_api', 
          status: 'error', 
          message: error.message 
        })
      }

      const duration = Date.now() - startTime
      const overallStatus = checks.every(c => c.status === 'ok') ? 'ok' : 'error'

      return {
        status: overallStatus,
        timestamp: new Date().toISOString(),
        checks: [
          ...checks,
          { 
            name: 'response_time', 
            status: duration < 5000 ? 'ok' : 'error',
            message: `${duration}ms`
          }
        ]
      }

    } catch (error: any) {
      console.error('SystemApiClient: Error in health check:', error)
      return {
        status: 'error',
        timestamp: new Date().toISOString(),
        checks: [{ 
          name: 'health_check', 
          status: 'error', 
          message: error.message 
        }]
      }
    }
  }
}

// Singleton instance для удобства
export const systemApi = new SystemApiClient()

// Backward compatibility функции (для постепенной миграции)
export async function listBranches(): Promise<Branch[]> {
  return systemApi.listBranches()
}

export async function createBranch(name: string): Promise<Branch> {
  return systemApi.createBranch(name)
}

export async function updateBranch(id: string, name: string): Promise<Branch> {
  return systemApi.updateBranch(id, name)
}

export async function deleteBranch(id: string): Promise<void> {
  return systemApi.deleteBranch(id)
}

export async function checkBranchUsage(id: string): Promise<BranchUsageInfo> {
  return systemApi.checkBranchUsage(id)
}
