/**
 * Типы для метрик и KPI
 * Централизованное место для всех типов, связанных с метриками
 */

export interface KpiUpsertRow {
  teacher_id: string
  return_pct?: number | null
  trial_pct?: number | null
  trial_total?: number | null
  last_year_base?: number | null
  last_year_returned?: number | null
  trial_converted?: number | null
  branch_id?: string | null
}

export interface BatchUpsertResult {
  affected: number
  recomputation?: {
    executed: boolean
    reason: string
  }
}
