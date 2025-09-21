import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { withErrorHandler } from "@/lib/middleware/api-error-handler"
import { withPerformanceMonitoring } from "@/lib/middleware/performance-monitor"

export const dynamic = "force-dynamic"

async function metricsHandler(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const teacherId = searchParams.get("teacher_id")

    let query = supabaseAdmin
      .from("teacher_metrics")
      .select(`
        teacher_id,
        branch_id,
        last_year_base,
        last_year_returned,
        trial_total,
        trial_converted,
        return_pct,
        trial_pct,
        score,
        updated_by,
        updated_at
      `)

    if (teacherId) {
      query = query.eq("teacher_id", teacherId)
    }

    const { data, error } = await query.order("updated_at", { ascending: false })

    if (error) throw error

    return NextResponse.json(data || [])
  } catch (error: any) {
    console.error("GET /api/metrics", error)
    throw error // Middleware обработает ошибку
  }
}

// Применяем middleware для обработки ошибок и мониторинга
export const GET = withErrorHandler(
  withPerformanceMonitoring(metricsHandler, '/api/metrics'),
  'metrics'
)
