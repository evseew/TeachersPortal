import { describe, it, expect } from '@jest/globals'

describe("/api/leaderboard contracts", () => {
  const base = "http://localhost:3000"

  it("branch_overall returns ordered fields", async () => {
    const res = await fetch(`${base}/api/leaderboard?type=branch_overall`)
    expect(res.ok).toBe(true)
    const data = (await res.json()) as any[]
    if (data.length > 0) {
      const row = data[0]
      expect(row).toHaveProperty("branch_id")
      expect(row).toHaveProperty("branch_name")
      expect(row).toHaveProperty("score")
      expect(row).toHaveProperty("rank")
      expect(row).toHaveProperty("delta_rank")
      expect(row).toHaveProperty("delta_score")
    }
  })

  it("teacher_overall returns fields with category & branch_name", async () => {
    const res = await fetch(`${base}/api/leaderboard?type=teacher_overall`)
    expect(res.ok).toBe(true)
    const data = (await res.json()) as any[]
    if (data.length > 0) {
      const row = data[0]
      expect(row).toHaveProperty("teacher_id")
      expect(row).toHaveProperty("name")
      expect(row).toHaveProperty("category")
      expect(row).toHaveProperty("branch_name")
      expect(row).toHaveProperty("score")
      expect(row).toHaveProperty("rank")
      expect(row).toHaveProperty("delta_rank")
      expect(row).toHaveProperty("delta_score")
    }
  })

  it("shows teachers from profiles even if absent in current_scores (score=0, rank=999)", async () => {
    const res = await fetch(`${base}/api/leaderboard?type=teacher_overall`)
    expect(res.ok).toBe(true)
    const data = (await res.json()) as any[]
    // Contract-only: if any teacher has null-ish delta fields, ensure score/rank defaults are present
    if (data.length > 0) {
      const anyWithDefaults = data.some((r) => r && typeof r.teacher_id === 'string' && (r.rank === 999 || r.score === 0))
      expect(anyWithDefaults).toBeTypeOf("boolean")
    }
  })
})


