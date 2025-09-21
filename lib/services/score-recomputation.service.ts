/**
 * Интеллектуальный сервис пересчета рейтингов
 * Цель: Избежать множественных излишних пересчетов
 */

import { supabaseAdmin } from '@/lib/supabase/admin'

export interface RecomputationResult {
  executed: boolean
  reason: string
  teacherChanges?: number
  branchChanges?: number
  timestamp: string
  duration?: number
}

export interface RecomputationOptions {
  force?: boolean
  scope?: 'teacher_overall' | 'branch_overall' | 'all'
  skipIfRecent?: boolean
  maxFrequency?: number // минимальные секунды между пересчетами
}

export class ScoreRecomputationService {
  private static instance: ScoreRecomputationService
  private lastRecomputeTime: Map<string, Date> = new Map()
  private readonly DEFAULT_MIN_INTERVAL = 30000 // 30 секунд

  static getInstance(): ScoreRecomputationService {
    if (!ScoreRecomputationService.instance) {
      ScoreRecomputationService.instance = new ScoreRecomputationService()
    }
    return ScoreRecomputationService.instance
  }

  /**
   * Интеллектуальный пересчет рейтингов
   * Пересчитывает только при необходимости
   */
  async recomputeIfNeeded(
    trigger: string,
    options: RecomputationOptions = {}
  ): Promise<RecomputationResult> {
    const startTime = Date.now()
    const timestamp = new Date().toISOString()

    try {
      console.log(`🧠 SmartRecomputation: Проверяем необходимость пересчета (trigger: ${trigger})`)

      // Проверяем частоту вызовов
      if (!options.force && options.skipIfRecent !== false) {
        const frequencyCheck = this.checkFrequency(trigger, options.maxFrequency)
        if (!frequencyCheck.allowed) {
          return {
            executed: false,
            reason: frequencyCheck.reason,
            timestamp
          }
        }
      }

      // Проверяем есть ли изменения в данных
      if (!options.force) {
        const changesCheck = await this.detectChanges(options.scope)
        if (!changesCheck.hasChanges) {
          return {
            executed: false,
            reason: changesCheck.reason,
            timestamp
          }
        }
      }

      // Выполняем пересчет
      const result = await this.performRecomputation(options.scope)
      
      // Обновляем время последнего пересчета
      this.lastRecomputeTime.set(trigger, new Date())

      const duration = Date.now() - startTime

      console.log(`✅ SmartRecomputation: Пересчет выполнен за ${duration}ms`)

      return {
        executed: true,
        reason: `Recomputation executed for ${options.scope || 'all'} scope`,
        teacherChanges: result.teacherChanges,
        branchChanges: result.branchChanges,
        timestamp,
        duration
      }

    } catch (error: any) {
      console.error('❌ SmartRecomputation: Ошибка пересчета:', error)
      
      return {
        executed: false,
        reason: `Error: ${error.message}`,
        timestamp
      }
    }
  }

  /**
   * Принудительный пересчет без проверок
   */
  async forceRecompute(scope?: 'teacher_overall' | 'branch_overall' | 'all'): Promise<RecomputationResult> {
    return this.recomputeIfNeeded('force', { force: true, scope })
  }

  /**
   * Проверяет частоту вызовов
   */
  private checkFrequency(
    trigger: string, 
    maxFrequency?: number
  ): { allowed: boolean; reason: string } {
    const minInterval = maxFrequency || this.DEFAULT_MIN_INTERVAL
    const lastTime = this.lastRecomputeTime.get(trigger)
    
    if (!lastTime) {
      return { allowed: true, reason: 'First execution for this trigger' }
    }

    const timeSinceLastCall = Date.now() - lastTime.getTime()
    
    if (timeSinceLastCall < minInterval) {
      const remainingTime = Math.ceil((minInterval - timeSinceLastCall) / 1000)
      return {
        allowed: false,
        reason: `Too frequent calls. Wait ${remainingTime}s (last call: ${lastTime.toISOString()})`
      }
    }

    return { allowed: true, reason: 'Frequency check passed' }
  }

  /**
   * Проверяет есть ли изменения в данных требующие пересчета
   */
  private async detectChanges(scope?: string): Promise<{ hasChanges: boolean; reason: string }> {
    try {
      // Проверяем изменения в teacher_metrics за последние 5 минут
      const { data: recentChanges, error } = await supabaseAdmin
        .from('teacher_metrics')
        .select('teacher_id')
        .gte('updated_at', new Date(Date.now() - 5 * 60 * 1000).toISOString())

      if (error) throw error

      if (!recentChanges || recentChanges.length === 0) {
        return {
          hasChanges: false,
          reason: 'No changes in teacher_metrics in the last 5 minutes'
        }
      }

      return {
        hasChanges: true,
        reason: `Found ${recentChanges.length} recent changes in teacher_metrics`
      }

    } catch (error: any) {
      console.error('❌ Error detecting changes:', error)
      // При ошибке проверки считаем что изменения есть (безопасность)
      return {
        hasChanges: true,
        reason: `Error detecting changes, assuming changes exist: ${error.message}`
      }
    }
  }

  /**
   * Выполняет фактический пересчет рейтингов
   */
  private async performRecomputation(
    scope?: 'teacher_overall' | 'branch_overall' | 'all'
  ): Promise<{ teacherChanges: number; branchChanges: number }> {
    
    if (scope === 'teacher_overall') {
      // Пробуем новую оптимизированную RPC функцию если есть
      try {
        const { data, error } = await supabaseAdmin.rpc('recompute_current_scores_v2', {
          p_scope: 'teacher_overall',
          p_force: false
        })

        if (error) throw error
        return {
          teacherChanges: data?.teacher_changes || 0,
          branchChanges: 0
        }
      } catch (error) {
        // Fallback к стандартной функции
        const { error: fallbackError } = await supabaseAdmin.rpc('recompute_current_scores')
        if (fallbackError) throw fallbackError
        return { teacherChanges: 1, branchChanges: 0 }
      }
    }

    if (scope === 'branch_overall') {
      try {
        const { data, error } = await supabaseAdmin.rpc('recompute_current_scores_v2', {
          p_scope: 'branch_overall',
          p_force: false
        })

        if (error) throw error
        return {
          teacherChanges: 0,
          branchChanges: data?.branch_changes || 0
        }
      } catch (error) {
        // Fallback к стандартной функции
        const { error: fallbackError } = await supabaseAdmin.rpc('recompute_current_scores')
        if (fallbackError) throw fallbackError
        return { teacherChanges: 0, branchChanges: 1 }
      }
    }

    // Полный пересчет (по умолчанию)
    try {
      const { data, error } = await supabaseAdmin.rpc('recompute_current_scores_v2', {
        p_scope: null,
        p_force: false
      })

      if (error) throw error
      
      return {
        teacherChanges: data?.teacher_changes || 0,
        branchChanges: data?.branch_changes || 0
      }
    } catch (error) {
      // Fallback к стандартной функции
      const { error: fallbackError } = await supabaseAdmin.rpc('recompute_current_scores')
      if (fallbackError) throw fallbackError
      return { teacherChanges: 1, branchChanges: 1 }
    }
  }

  /**
   * Получает статистику пересчетов
   */
  getRecomputationStats(): {
    triggers: Array<{ name: string; lastExecution: string }>
    totalTriggers: number
  } {
    const triggers = Array.from(this.lastRecomputeTime.entries()).map(([name, date]) => ({
      name,
      lastExecution: date.toISOString()
    }))

    return {
      triggers,
      totalTriggers: triggers.length
    }
  }

  /**
   * Очищает историю пересчетов
   */
  clearHistory(): void {
    this.lastRecomputeTime.clear()
    console.log('🧹 SmartRecomputation: История очищена')
  }

  /**
   * Устанавливает кастомное время последнего пересчета
   * Полезно для тестирования или инициализации
   */
  setLastRecomputeTime(trigger: string, time: Date): void {
    this.lastRecomputeTime.set(trigger, time)
  }
}
