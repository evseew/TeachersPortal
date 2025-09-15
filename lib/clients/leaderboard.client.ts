/**
 * Типизированный API клиент для работы с лидербордами
 * Заменяет функции из lib/api/leaderboard.ts
 */

import type { BranchLeaderboardRow, TeacherLeaderboardRow } from '@/lib/types/shared'
import type { SyncResult } from '@/lib/services/leaderboard-sync.service'

export interface LeaderboardApiOptions {
  cache?: RequestInit['cache']
  signal?: AbortSignal
}

export class LeaderboardApiClient {
  private baseUrl: string

  constructor(baseUrl = '') {
    this.baseUrl = baseUrl
  }

  /**
   * Получает рейтинг преподавателей
   */
  async fetchTeacherLeaderboard(options: LeaderboardApiOptions = {}): Promise<TeacherLeaderboardRow[]> {
    try {
      const response = await fetch(`${this.baseUrl}/api/leaderboard?type=teacher_overall`, {
        cache: options.cache || 'no-store',
        signal: options.signal,
        headers: {
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error(`Failed to load teacher leaderboard (${response.status})`)
      }

      const data = await response.json()
      
      // Валидация структуры данных
      if (!Array.isArray(data)) {
        throw new Error('Invalid teacher leaderboard data structure')
      }

      return data as TeacherLeaderboardRow[]

    } catch (error: any) {
      console.error('LeaderboardApiClient: Error fetching teacher leaderboard:', error)
      throw error
    }
  }

  /**
   * Получает рейтинг филиалов
   */
  async fetchBranchLeaderboard(options: LeaderboardApiOptions = {}): Promise<BranchLeaderboardRow[]> {
    try {
      const response = await fetch(`${this.baseUrl}/api/leaderboard?type=branch_overall`, {
        cache: options.cache || 'no-store',
        signal: options.signal,
        headers: {
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error(`Failed to load branch leaderboard (${response.status})`)
      }

      const data = await response.json()
      
      // Валидация структуры данных
      if (!Array.isArray(data)) {
        throw new Error('Invalid branch leaderboard data structure')
      }

      return data as BranchLeaderboardRow[]

    } catch (error: any) {
      console.error('LeaderboardApiClient: Error fetching branch leaderboard:', error)
      throw error
    }
  }

  /**
   * Запускает синхронизацию лидербордов
   */
  async syncLeaderboardData(options: LeaderboardApiOptions = {}): Promise<SyncResult> {
    try {
      const response = await fetch(`${this.baseUrl}/api/system/sync-leaderboard`, {
        method: 'POST',
        signal: options.signal,
        headers: {
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `Sync failed (${response.status})`)
      }

      const data = await response.json()
      return data as SyncResult

    } catch (error: any) {
      console.error('LeaderboardApiClient: Error syncing leaderboard:', error)
      throw error
    }
  }

  /**
   * Получает оба рейтинга параллельно
   */
  async fetchAllLeaderboards(options: LeaderboardApiOptions = {}): Promise<{
    teachers: TeacherLeaderboardRow[]
    branches: BranchLeaderboardRow[]
  }> {
    try {
      const [teachers, branches] = await Promise.all([
        this.fetchTeacherLeaderboard(options),
        this.fetchBranchLeaderboard(options)
      ])

      return { teachers, branches }

    } catch (error: any) {
      console.error('LeaderboardApiClient: Error fetching all leaderboards:', error)
      throw error
    }
  }

  /**
   * Получает статистику лидербордов
   */
  async getLeaderboardStats(options: LeaderboardApiOptions = {}): Promise<{
    totalTeachers: number
    totalBranches: number
    averageScore: number
    topPerformer: string | null
  }> {
    try {
      const teachers = await this.fetchTeacherLeaderboard(options)
      const branches = await this.fetchBranchLeaderboard(options)

      const totalTeachers = teachers.length
      const totalBranches = branches.length
      
      const teacherScores = teachers.map(t => t.score).filter(s => s > 0)
      const averageScore = teacherScores.length > 0 
        ? Math.round(teacherScores.reduce((sum, score) => sum + score, 0) / teacherScores.length)
        : 0

      const topPerformer = teachers.length > 0 && teachers[0].rank === 1 
        ? teachers[0].name 
        : null

      return {
        totalTeachers,
        totalBranches,
        averageScore,
        topPerformer
      }

    } catch (error: any) {
      console.error('LeaderboardApiClient: Error getting stats:', error)
      throw error
    }
  }

  /**
   * Поиск преподавателя в рейтинге
   */
  async findTeacherInLeaderboard(
    teacherId: string, 
    options: LeaderboardApiOptions = {}
  ): Promise<TeacherLeaderboardRow | null> {
    try {
      const teachers = await this.fetchTeacherLeaderboard(options)
      return teachers.find(t => t.teacher_id === teacherId) || null

    } catch (error: any) {
      console.error('LeaderboardApiClient: Error finding teacher:', error)
      throw error
    }
  }

  /**
   * Получает топ N преподавателей
   */
  async getTopTeachers(
    limit: number = 10, 
    options: LeaderboardApiOptions = {}
  ): Promise<TeacherLeaderboardRow[]> {
    try {
      const teachers = await this.fetchTeacherLeaderboard(options)
      return teachers.slice(0, limit)

    } catch (error: any) {
      console.error('LeaderboardApiClient: Error getting top teachers:', error)
      throw error
    }
  }

  /**
   * Получает преподавателей определенной категории
   */
  async getTeachersByCategory(
    category: string,
    options: LeaderboardApiOptions = {}
  ): Promise<TeacherLeaderboardRow[]> {
    try {
      const teachers = await this.fetchTeacherLeaderboard(options)
      return teachers.filter(t => t.category === category)

    } catch (error: any) {
      console.error('LeaderboardApiClient: Error getting teachers by category:', error)
      throw error
    }
  }
}

// Singleton instance для удобства
export const leaderboardApi = new LeaderboardApiClient()

// Backward compatibility функции (для постепенной миграции)
export async function fetchBranchLeaderboard(): Promise<BranchLeaderboardRow[]> {
  return leaderboardApi.fetchBranchLeaderboard()
}

export async function fetchTeacherLeaderboard(): Promise<TeacherLeaderboardRow[]> {
  return leaderboardApi.fetchTeacherLeaderboard()
}
