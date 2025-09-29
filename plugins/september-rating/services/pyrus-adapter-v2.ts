/**
 * НОВЫЙ Адаптер плагина September Rating для работы с Pyrus
 * 
 * Использует новую надежную архитектуру
 * Основана на проверенной логике из final_fixed_report.md
 */

import { PyrusClientFactory } from "@/lib/pyrus/client-factory"
import { PyrusSyncServiceV2 } from "@/lib/services/pyrus-sync-service-v2"
import { SeptemberRatingSyncStatusService } from "@/lib/services/september-rating-sync-status"
import { pyrusDebugLogger } from "@/lib/pyrus/core/debug-logger"
import type { SyncResult, SyncablePlugin } from "../../core/plugin-types"
import type { DetailedSyncStatus } from "@/lib/types/september-rating"

/**
 * НОВЫЙ Адаптер с правильной логикой синхронизации
 */
export class SeptemberRatingPyrusAdapterV2 implements SyncablePlugin {
  private syncService: PyrusSyncServiceV2
  private statusService: SeptemberRatingSyncStatusService

  constructor() {
    const formsClient = PyrusClientFactory.createFormsClient()
    const teachersClient = PyrusClientFactory.createTeachersClientV2()
    this.syncService = new PyrusSyncServiceV2(formsClient, teachersClient)
    this.statusService = new SeptemberRatingSyncStatusService()
  }

  /**
   * Запуск синхронизации данных September Rating
   * ТОЧНАЯ КОПИЯ логики из Python
   */
  async sync(): Promise<SyncResult> {
    const startedAt = new Date()
    const errors: string[] = []
    const warnings: string[] = []

    try {
      console.log('🔄 Starting September Rating sync with new architecture')

      // Запускаем полную синхронизацию через новый сервис
      const result = await this.syncService.syncAllForms()

      const completedAt = new Date()

      // Преобразуем результат в формат SyncResult
      const syncResult: SyncResult = {
        success: result.success,
        recordsProcessed: result.teachersProcessed,
        recordsUpdated: result.teachersProcessed, // Пока считаем равными
        startedAt,
        completedAt,
        errors: result.errors.length > 0 ? result.errors : undefined,
        warnings: warnings.length > 0 ? warnings : undefined
      }

      // Сохраняем результат в базу данных
      try {
        await this.statusService.saveSyncResult(syncResult)
      } catch (dbError) {
        console.warn('⚠️ Failed to save sync result to database:', dbError)
      }

      // Выводим детальную отладочную информацию
      pyrusDebugLogger.printFinalSummary()

      console.log(`${syncResult.success ? '✅' : '❌'} September Rating sync completed:`, {
        success: syncResult.success,
        recordsProcessed: syncResult.recordsProcessed,
        recordsUpdated: syncResult.recordsUpdated,
        duration: `${result.duration}ms`,
        errors: result.errors.length,
        warnings: warnings.length
      })

      return syncResult

    } catch (error) {
      const completedAt = new Date()
      const errorMsg = error instanceof Error ? error.message : 'Unknown sync error'
      
      console.error('💥 September Rating sync failed:', errorMsg)
      
      return {
        success: false,
        recordsProcessed: 0,
        recordsUpdated: 0,
        startedAt,
        completedAt,
        errors: [errorMsg, ...errors]
      }
    }
  }

  /**
   * Получить статус последней синхронизации
   */
  async getSyncStatus(): Promise<DetailedSyncStatus> {
    return await this.statusService.getDetailedSyncStatus()
  }
}
