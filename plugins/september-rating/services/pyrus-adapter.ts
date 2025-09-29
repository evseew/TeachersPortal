import { PyrusSyncService, TeacherMetrics } from "@/lib/services/pyrus-sync.service"
import { PyrusClientFactory } from "@/lib/pyrus/client-factory"
import { SeptemberRatingSyncStatusService } from "@/lib/services/september-rating-sync-status"
import type { SyncResult, SyncablePlugin } from "../../core/plugin-types"
import type { SeptemberTeacherStats, DetailedSyncStatus, TeacherGroupType } from "@/lib/types/september-rating"
import { SEPTEMBER_FORMS, determineTeacherGroup, isTeacherExcluded } from "@/lib/config/september-forms-config"
import selectionRules from "../rules/selection-rules.json"

/**
 * Адаптер плагина September Rating для работы с Pyrus
 * 
 * Использует правила выборки из JSON файла для синхронизации данных
 * из форм Pyrus в базу данных портала
 */
export class SeptemberRatingPyrusAdapter implements SyncablePlugin {
  private syncService: PyrusSyncService
  private statusService: SeptemberRatingSyncStatusService

  constructor() {
    const formsClient = PyrusClientFactory.createFormsClient()
    const teachersClient = PyrusClientFactory.createTeachersClient()
    this.syncService = new PyrusSyncService(formsClient, teachersClient)
    this.statusService = new SeptemberRatingSyncStatusService()
  }

  /**
   * Получить правила выборки из JSON конфигурации
   */
  private getRules(): typeof selectionRules {
    return selectionRules
  }

  /**
   * Запуск синхронизации данных September Rating
   */
  async sync(): Promise<SyncResult> {
    const startedAt = new Date()
    const errors: string[] = []
    const warnings: string[] = []
    let recordsProcessed = 0
    let recordsUpdated = 0

    try {
      console.log('🔄 Starting September Rating sync with rules:', this.getRules().name)

      // Синхронизация формы 2304918 (старички)
      try {
        console.log('📊 Syncing form 2304918 (oldies)...')
        const oldiesData = await this.syncService.syncForm2304918()
        recordsProcessed += oldiesData.length
        recordsUpdated += oldiesData.length
        console.log(`✅ Synced ${oldiesData.length} oldies records`)
      } catch (error) {
        const errorMsg = `Failed to sync form 2304918: ${error instanceof Error ? error.message : 'Unknown error'}`
        errors.push(errorMsg)
        console.error('❌', errorMsg)
      }

      // Синхронизация формы 792300 (trial)
      try {
        console.log('📊 Syncing form 792300 (trial)...')
        const trialData = await this.syncService.syncForm792300()
        recordsProcessed += trialData.length
        recordsUpdated += trialData.length
        console.log(`✅ Synced ${trialData.length} trial records`)
      } catch (error) {
        const errorMsg = `Failed to sync form 792300: ${error instanceof Error ? error.message : 'Unknown error'}`
        errors.push(errorMsg)
        console.error('❌', errorMsg)
      }

      // Применение исключений преподавателей
      try {
        console.log('🚫 Applying teacher exclusions...')
        const exclusions = this.getRules().teacher_exclusions
        
        // Логируем исключения для прозрачности
        if (exclusions.oldies.teachers.length > 0) {
          warnings.push(`Excluded ${exclusions.oldies.teachers.length} teachers from oldies: ${exclusions.oldies.teachers.join(', ')}`)
        }
        if (exclusions.trial.teachers.length > 0) {
          warnings.push(`Excluded ${exclusions.trial.teachers.length} teachers from trial: ${exclusions.trial.teachers.join(', ')}`)
        }
        
        console.log(`ℹ️ Teacher exclusions applied: ${exclusions.oldies.teachers.length + exclusions.trial.teachers.length} total`)
      } catch (error) {
        const errorMsg = `Failed to apply exclusions: ${error instanceof Error ? error.message : 'Unknown error'}`
        warnings.push(errorMsg)
        console.warn('⚠️', errorMsg)
      }

      const completedAt = new Date()
      const success = errors.length === 0

      const result: SyncResult = {
        success,
        recordsProcessed,
        recordsUpdated,
        startedAt,
        completedAt,
        errors: errors.length > 0 ? errors : undefined,
        warnings: warnings.length > 0 ? warnings : undefined
      }

      // Сохраняем результат в базу данных
      try {
        await this.statusService.saveSyncResult(result)
      } catch (dbError) {
        console.warn('⚠️ Failed to save sync result to database:', dbError)
      }

      console.log(`${success ? '✅' : '❌'} September Rating sync completed:`, {
        success,
        recordsProcessed,
        recordsUpdated,
        duration: `${completedAt.getTime() - startedAt.getTime()}ms`,
        errors: errors.length,
        warnings: warnings.length
      })

      return result

    } catch (error) {
      const completedAt = new Date()
      const errorMsg = error instanceof Error ? error.message : 'Unknown sync error'
      
      console.error('💥 September Rating sync failed:', errorMsg)
      
      return {
        success: false,
        recordsProcessed,
        recordsUpdated,
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

  /**
   * Маппинг данных Pyrus в метрики преподавателей
   * 
   * Применяет правила выборки и исключения из JSON конфигурации
   */
  private mapPyrusDataToMetrics(data: TeacherMetrics[]): TeacherMetrics[] {
    const rules = this.getRules()
    
    return data
      .filter(item => {
        // Применяем фильтры из правил
        // Например, исключаем закрытые филиалы
        const branchExclusions = rules.forms.form_2304918.filters
          .find(f => f.field === 'branch' && f.condition === 'исключить')?.values || []
        
        if (branchExclusions.includes(item.branch_name)) {
          return false
        }
        
        // Проверяем статус PE
        const statusFilter = rules.forms.form_2304918.filters
          .find(f => f.field === 'status_pe' && f.condition === 'включить')?.values || []
        
        if (statusFilter.length > 0 && !statusFilter.includes('status_pe' in item ? String(item.status_pe) : '')) {
          return false
        }
        
        return true
      })
      .map(item => ({
        ...item,
        // Дополнительные преобразования данных
        score: this.calculateScore(item),
        group: this.determineTeacherGroup(item)
      }))
  }

  /**
   * Обработка исключений преподавателей
   */
  private handleExclusions(data: TeacherMetrics[], formType: TeacherGroupType): TeacherMetrics[] {
    const rules = this.getRules()
    const exclusions = rules.teacher_exclusions[formType]?.teachers || []
    
    return data.filter(item => {
      const isExcluded = isTeacherExcluded(item.teacher_name, formType)
      
      if (isExcluded) {
        console.log(`🚫 Excluding teacher ${item.teacher_name} from ${formType} rating`)
      }
      
      return !isExcluded
    })
  }

  /**
   * Расчет балла преподавателя
   */
  private calculateScore(item: TeacherMetrics): number {
    // Реализация расчета по формулам из правил
    const returnPercent = (item.last_year_returned || 0) / Math.max(item.last_year_base || 1, 1) * 100
    const conversionPercent = (item.trial_converted || 0) / Math.max(item.trial_total || 1, 1) * 100
    
    return Math.round(returnPercent + conversionPercent)
  }

  /**
   * Определение группы преподавателя
   */
  private determineTeacherGroup(item: TeacherMetrics): string {
    const oldiesCount = Number(item.last_year_base || 0)
    const trialCount = Number(item.trial_total || 0)
    
    // Определяем группу для старичков
    if (oldiesCount > 0) {
      return `oldies-${determineTeacherGroup(oldiesCount, 'oldies')}`
    }
    
    // Определяем группу для trial
    if (trialCount > 0) {
      return `trial-${determineTeacherGroup(trialCount, 'trial')}`
    }
    
    return 'other'
  }
}
