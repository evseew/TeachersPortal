import { NextRequest, NextResponse } from "next/server"
import { supabaseApiV1 } from "@/lib/supabase/admin"
import { withErrorHandler } from "@/lib/middleware/api-error-handler"
import { withPerformanceMonitoring } from "@/lib/middleware/performance-monitor"

export const dynamic = 'force-dynamic'

async function leaderboardHandler(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const type = searchParams.get("type")
  const isDev = process.env.NODE_ENV !== "production"

  try {
    if (type === "branch_overall") {
      const { data, error } = await supabaseApiV1.from("vw_leaderboard_branch_overall_all").select("*")
      if (error) throw error
      return NextResponse.json(data)
    }
    if (type === "teacher_overall") {
      const { data, error } = await supabaseApiV1.from("vw_leaderboard_teacher_overall_all").select("*")
      if (error) throw error
      return NextResponse.json(data)
    }
    return NextResponse.json({ error: "Invalid type" }, { status: 400 })
  } catch (error: any) {
    console.error("/api/leaderboard error", error)
    throw error // Middleware обработает ошибку
  }
}

// Применяем middleware для обработки ошибок и мониторинга
export const GET = withErrorHandler(
  withPerformanceMonitoring(leaderboardHandler, '/api/leaderboard'),
  'leaderboard'
)


