/**
 * Типы для лидербордов
 * Централизованное место для всех типов, связанных с лидербордами
 */

export type BranchLeaderboardRow = {
  branch_id: string
  branch_name: string
  score: number
  rank: number
  delta_rank: number | null
  delta_score: number | null
  updated_at: string
  prize: string | null
}

export type TeacherLeaderboardRow = {
  teacher_id: string
  name: string
  category: "Partner" | "Senior" | "Middle" | "Junior" | "Newcomer" | string
  branch_id: string | null
  branch_name: string | null
  return_pct: number | null
  trial_pct: number | null
  score: number
  rank: number
  delta_rank: number | null
  delta_score: number | null
  updated_at: string
  prize: string | null
}
