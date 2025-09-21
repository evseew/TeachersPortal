/**
 * Типизированный API клиент для работы с метриками
 * Заменяет функции из lib/api/metrics.ts
 */

import type { KpiUpsertRow, BatchUpsertResult } from '@/lib/types/shared'

export interface MetricsApiOptions {
  signal?: AbortSignal
  timeout?: number
}

export class MetricsApiClient {
  private baseUrl: string

  constructor(baseUrl = '') {
    this.baseUrl = baseUrl
  }

  /**
   * Выполняет пакетное обновление метрик
   */
  async batchUpsertMetrics(
    rows: KpiUpsertRow[], 
    editorEmail?: string,
    options: MetricsApiOptions = {}
  ): Promise<BatchUpsertResult> {
    try {
      const controller = new AbortController()
      const timeoutId = options.timeout 
        ? setTimeout(() => controller.abort(), options.timeout)
        : null

      const signal = options.signal || controller.signal

      const response = await fetch(`${this.baseUrl}/api/metrics/batch-upsert`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ rows, editorEmail }),
        signal
      })

      if (timeoutId) clearTimeout(timeoutId)

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData?.error ?? `Failed to upsert metrics (${response.status})`)
      }

      const result = await response.json()
      return result as BatchUpsertResult

    } catch (error: any) {
      console.error('MetricsApiClient: Error in batch upsert:', error)
      throw error
    }
  }

  /**
   * Получает метрики по ID преподавателя
   */
  async getTeacherMetrics(
    teacherId: string,
    options: MetricsApiOptions = {}
  ): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}/api/metrics?teacher_id=${teacherId}`, {
        signal: options.signal,
        headers: {
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error(`Failed to get teacher metrics (${response.status})`)
      }

      return await response.json()

    } catch (error: any) {
      console.error('MetricsApiClient: Error getting teacher metrics:', error)
      throw error
    }
  }

  /**
   * Валидирует данные метрик
   */
  validateKpiRow(row: Partial<KpiUpsertRow>): { isValid: boolean; errors: string[] } {
    const errors: string[] = []

    if (!row.teacher_id) {
      errors.push('teacher_id is required')
    }

    // Проверяем что хотя бы одно поле для обновления задано
    const hasData = Object.keys(row).some(key => 
      key !== 'teacher_id' && row[key as keyof KpiUpsertRow] !== undefined
    )

    if (!hasData) {
      errors.push('At least one metric field must be provided')
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  }

  /**
   * Подготавливает данные для пакетного обновления
   */
  prepareBatchData(rawData: any[]): KpiUpsertRow[] {
    return rawData.map(row => ({
      teacher_id: row.teacher_id,
      return_pct: row.return_pct != null ? Number(row.return_pct) : null,
      trial_pct: row.trial_pct != null ? Number(row.trial_pct) : null,
      trial_total: row.trial_total != null ? Number(row.trial_total) : null,
      last_year_base: row.last_year_base != null ? Number(row.last_year_base) : null,
      last_year_returned: row.last_year_returned != null ? Number(row.last_year_returned) : null,
      trial_converted: row.trial_converted != null ? Number(row.trial_converted) : null,
      branch_id: row.branch_id || null
    })).filter(row => {
      const validation = this.validateKpiRow(row)
      if (!validation.isValid) {
        console.warn('Skipping invalid row:', row, validation.errors)
        return false
      }
      return true
    })
  }
}

// Singleton instance для удобства
export const metricsApi = new MetricsApiClient()

// Backward compatibility функция (для постепенной миграции)
export async function batchUpsertMetrics(rows: KpiUpsertRow[], editorEmail?: string): Promise<BatchUpsertResult> {
  return metricsApi.batchUpsertMetrics(rows, editorEmail)
}
