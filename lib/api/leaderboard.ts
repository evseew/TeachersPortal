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

export async function fetchBranchLeaderboard(): Promise<BranchLeaderboardRow[]> {
  const res = await fetch("/api/leaderboard?type=branch_overall", { cache: "no-store" })
  if (!res.ok) throw new Error(`Failed to load branch leaderboard (${res.status})`)
  return (await res.json()) as BranchLeaderboardRow[]
}

export async function fetchTeacherLeaderboard(): Promise<TeacherLeaderboardRow[]> {
  const res = await fetch("/api/leaderboard?type=teacher_overall", { cache: "no-store" })
  if (!res.ok) throw new Error(`Failed to load teacher leaderboard (${res.status})`)
  return (await res.json()) as TeacherLeaderboardRow[]
}


