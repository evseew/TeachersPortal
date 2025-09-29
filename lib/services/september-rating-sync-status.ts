/**
 * Сервис для работы со статусом синхронизации September Rating
 * 
 * Предоставляет функции для сохранения и получения информации
 * о синхронизациях из базы данных
 */

import { supabaseAdmin } from '../supabase/admin'
import type { 
  SyncResult, 
  DetailedSyncStatus, 
  SeptemberSyncLogEntry,
  FormSyncStatus 
} from '../types/september-rating'
import { SYNC_CONFIG } from '../config/september-forms-config'

export class SeptemberRatingSyncStatusService {
  
  /**
   * Сохранить результат синхронизации в базу данных
   */
  async saveSyncResult(result: SyncResult, initiatedBy?: string): Promise<void> {
    const duration = result.completedAt && result.startedAt 
      ? result.completedAt.getTime() - result.startedAt.getTime()
      : undefined

    const { error } = await supabaseAdmin
      .from('september_rating_sync_log')
      .insert({
        started_at: result.startedAt.toISOString(),
        completed_at: result.completedAt?.toISOString(),
        success: result.success,
        records_processed: result.recordsProcessed,
        records_updated: result.recordsUpdated,
        errors: result.errors || [],
        warnings: result.warnings || [],
        initiated_by: initiatedBy,
        duration_ms: duration
      })

    if (error) {
      console.error('Failed to save sync result to database:', error)
      throw new Error(`Database error: ${error.message}`)
    }
  }

  /**
   * Получить детальный статус синхронизации
   */
  async getDetailedSyncStatus(): Promise<DetailedSyncStatus> {
    try {
      // Получаем информацию о последней синхронизации
      const { data: lastSyncData, error: lastSyncError } = await supabaseAdmin
        .rpc('get_september_rating_last_sync')

      if (lastSyncError) {
        console.error('Failed to get last sync info:', lastSyncError)
      }

      const lastSync = lastSyncData?.[0]

      // Получаем статистику синхронизаций
      const { data: statsData, error: statsError } = await supabaseAdmin
        .rpc('get_september_rating_sync_stats')

      if (statsError) {
        console.error('Failed to get sync stats:', statsError)
      }

      const stats = statsData?.[0]

      // Проверяем, запущена ли сейчас синхронизация
      const { data: runningSync, error: runningSyncError } = await supabaseAdmin
        .from('september_rating_sync_log')
        .select('*')
        .is('completed_at', null)
        .order('started_at', { ascending: false })
        .limit(1)
        .single()

      const isRunning = !runningSyncError && !!runningSync

      // Определяем свежесть данных
      const dataFreshnessThreshold = SYNC_CONFIG.DATA_FRESHNESS_THRESHOLD_MS
      const now = new Date().getTime()
      
      const oldiesDataAge = lastSync?.last_sync_started_at 
        ? now - new Date(lastSync.last_sync_started_at).getTime()
        : Infinity
      
      const trialDataAge = oldiesDataAge // Пока считаем одинаково для обеих форм

      const getDataFreshness = (age: number) => {
        if (age < dataFreshnessThreshold) return 'fresh' as const
        if (age < dataFreshnessThreshold * 2) return 'stale' as const
        return 'outdated' as const
      }

      // Вычисляем время следующей синхронизации
      const nextScheduledSync = this.getNextScheduledSyncTime()

      // Формируем статус форм
      const formsStatus = {
        oldies: {
          lastUpdate: lastSync?.last_sync_started_at ? new Date(lastSync.last_sync_started_at) : undefined,
          recordCount: lastSync?.last_sync_records_processed || 0,
          errors: lastSync?.last_sync_errors_count > 0 ? ['Есть ошибки в последней синхронизации'] : [],
          warnings: lastSync?.last_sync_warnings_count > 0 ? ['Есть предупреждения в последней синхронизации'] : [],
          status: isRunning ? 'running' as const : (lastSync?.last_sync_success ? 'success' as const : 'error' as const)
        } as FormSyncStatus,
        trial: {
          lastUpdate: lastSync?.last_sync_started_at ? new Date(lastSync.last_sync_started_at) : undefined,
          recordCount: lastSync?.last_sync_records_processed || 0,
          errors: lastSync?.last_sync_errors_count > 0 ? ['Есть ошибки в последней синхронизации'] : [],
          warnings: lastSync?.last_sync_warnings_count > 0 ? ['Есть предупреждения в последней синхронизации'] : [],
          status: isRunning ? 'running' as const : (lastSync?.last_sync_success ? 'success' as const : 'error' as const)
        } as FormSyncStatus
      }

      const result: DetailedSyncStatus = {
        lastSync: lastSync ? {
          timestamp: new Date(lastSync.last_sync_started_at),
          success: lastSync.last_sync_success,
          duration: lastSync.last_sync_duration_ms || 0,
          recordsProcessed: lastSync.last_sync_records_processed || 0,
          recordsUpdated: lastSync.last_sync_records_processed || 0, // Пока считаем равными
          errors: lastSync.last_sync_errors_count > 0 ? ['Детали в логах'] : [],
          warnings: lastSync.last_sync_warnings_count > 0 ? ['Детали в логах'] : []
        } : undefined,
        formsStatus,
        dataFreshness: {
          oldies: getDataFreshness(oldiesDataAge),
          trial: getDataFreshness(trialDataAge)
        },
        nextScheduledSync,
        isRunning,
        currentStep: isRunning ? {
          step: 'form_2304918', // Предполагаем, что начинаем с первой формы
          progress: 25,
          message: 'Синхронизация в процессе...'
        } : undefined
      }

      return result

    } catch (error) {
      console.error('Failed to get detailed sync status:', error)
      
      // Возвращаем базовый статус в случае ошибки
      return {
        formsStatus: {
          oldies: {
            recordCount: 0,
            errors: ['Ошибка получения статуса'],
            warnings: [],
            status: 'error'
          },
          trial: {
            recordCount: 0,
            errors: ['Ошибка получения статуса'],
            warnings: [],
            status: 'error'
          }
        },
        dataFreshness: {
          oldies: 'outdated',
          trial: 'outdated'
        },
        isRunning: false
      }
    }
  }

  /**
   * Получить историю синхронизаций
   */
  async getSyncHistory(limit = 10): Promise<SeptemberSyncLogEntry[]> {
    const { data, error } = await supabaseAdmin
      .from('september_rating_sync_log')
      .select('*')
      .order('started_at', { ascending: false })
      .limit(limit)

    if (error) {
      console.error('Failed to get sync history:', error)
      return []
    }

    return data.map(row => ({
      id: row.id,
      startedAt: new Date(row.started_at),
      completedAt: row.completed_at ? new Date(row.completed_at) : undefined,
      success: row.success,
      recordsProcessed: row.records_processed,
      recordsUpdated: row.records_updated,
      errors: row.errors,
      warnings: row.warnings,
      initiatedBy: row.initiated_by,
      duration: row.duration_ms,
      createdAt: new Date(row.created_at)
    }))
  }

  /**
   * Отметить начало синхронизации
   */
  async markSyncStarted(initiatedBy?: string): Promise<number> {
    const { data, error } = await supabaseAdmin
      .from('september_rating_sync_log')
      .insert({
        started_at: new Date().toISOString(),
        success: false, // Будет обновлено при завершении
        initiated_by: initiatedBy
      })
      .select('id')
      .single()

    if (error) {
      console.error('Failed to mark sync as started:', error)
      throw new Error(`Database error: ${error.message}`)
    }

    return data.id
  }

  /**
   * Отметить завершение синхронизации
   */
  async markSyncCompleted(syncId: number, result: Partial<SyncResult>): Promise<void> {
    const duration = result.completedAt && result.startedAt 
      ? result.completedAt.getTime() - result.startedAt.getTime()
      : undefined

    const { error } = await supabaseAdmin
      .from('september_rating_sync_log')
      .update({
        completed_at: new Date().toISOString(),
        success: result.success || false,
        records_processed: result.recordsProcessed || 0,
        records_updated: result.recordsUpdated || 0,
        errors: result.errors || [],
        warnings: result.warnings || [],
        duration_ms: duration
      })
      .eq('id', syncId)

    if (error) {
      console.error('Failed to mark sync as completed:', error)
      throw new Error(`Database error: ${error.message}`)
    }
  }

  /**
   * Вычислить время следующей запланированной синхронизации
   */
  private getNextScheduledSyncTime(): Date {
    const now = new Date()
    const nextHour = new Date(now)
    nextHour.setHours(now.getHours() + 1, 0, 0, 0)
    return nextHour
  }

  /**
   * Проверить, запущена ли сейчас синхронизация
   */
  async isCurrentlyRunning(): Promise<boolean> {
    const { data, error } = await supabaseAdmin
      .from('september_rating_sync_log')
      .select('id')
      .is('completed_at', null)
      .limit(1)

    return !error && data.length > 0
  }

  /**
   * Получить статистику успешности синхронизаций
   */
  async getSyncSuccessRate(): Promise<number> {
    const { data, error } = await supabaseAdmin
      .rpc('get_september_rating_sync_stats')

    if (error || !data?.[0]) {
      return 0
    }

    return Number(data[0].success_rate) || 0
  }
}
