import { NextResponse } from "next/server"
import { supabaseAdmin, supabaseApiV1 } from "@/lib/supabase/admin"

export const dynamic = "force-dynamic"

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const teacherId = params.id

    // Получаем данные учителя из leaderboard view
    const { data: leaderboardData, error: leaderboardError } = await supabaseApiV1
      .from("vw_leaderboard_teacher_overall_all")
      .select("*")
      .eq("teacher_id", teacherId)
      .single()

    if (leaderboardError && leaderboardError.code !== "PGRST116") {
      throw leaderboardError
    }

    // Получаем дополнительные данные профиля
    const { data: profileData, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("user_id, email, full_name, role, category, branch_id, avatar_url, created_at")
      .eq("user_id", teacherId)
      .single()

    if (profileError) {
      if (profileError.code === "PGRST116") {
        return NextResponse.json({ error: "Teacher not found" }, { status: 404 })
      }
      throw profileError
    }

    // Получаем метрики учителя
    const { data: metricsData, error: metricsError } = await supabaseAdmin
      .from("teacher_metrics")
      .select("*")
      .eq("teacher_id", teacherId)
      .single()

    if (metricsError && metricsError.code !== "PGRST116") {
      throw metricsError
    }

    // Получаем историю изменений (последние снапшоты)
    const { data: historyData, error: historyError } = await supabaseAdmin
      .from("snapshots")
      .select("*")
      .eq("teacher_id", teacherId)
      .eq("scope", "teacher_overall")
      .eq("context", "all")
      .order("created_at", { ascending: false })
      .limit(10)

    if (historyError) {
      console.warn("Error loading history:", historyError)
    }

    // Формируем ответ
    const teacherData = {
      // Основные данные
      teacher_id: profileData.user_id,
      name: profileData.full_name || profileData.email,
      email: profileData.email,
      role: profileData.role,
      category: profileData.category,
      branch_id: profileData.branch_id,
      avatar_url: profileData.avatar_url,
      created_at: profileData.created_at,

      // Данные из лидерборда (если есть)
      rank: leaderboardData?.rank || null,
      score: leaderboardData?.score || 0,
      delta_rank: leaderboardData?.delta_rank || null,
      delta_score: leaderboardData?.delta_score || null,
      branch_name: leaderboardData?.branch_name || null,
      return_pct: leaderboardData?.return_pct || null,
      trial_pct: leaderboardData?.trial_pct || null,

      // Метрики (если есть)
      metrics: metricsData || null,

      // История изменений
      history: historyData || []
    }

    return NextResponse.json(teacherData)
  } catch (error: any) {
    console.error("GET /api/teacher/[id]", error)
    return NextResponse.json({ error: error.message ?? "Internal error" }, { status: 500 })
  }
}
