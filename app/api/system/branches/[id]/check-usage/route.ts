import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase/admin"

export async function GET(_: Request, { params }: { params: { id: string } }) {
  try {
    const branchId = params.id
    if (!branchId) {
      return NextResponse.json({ error: "Branch ID required" }, { status: 400 })
    }

    // Проверяем связанные записи
    const [profilesResult, metricsResult] = await Promise.all([
      // Преподаватели, привязанные к филиалу
      supabaseAdmin
        .from("profiles")
        .select("user_id, full_name, email")
        .eq("branch_id", branchId)
        .not("full_name", "is", null),
      
      // Метрики, связанные с филиалом
      supabaseAdmin
        .from("teacher_metrics")
        .select("teacher_id")
        .eq("branch_id", branchId)
    ])

    if (profilesResult.error) throw profilesResult.error
    if (metricsResult.error) throw metricsResult.error

    const linkedProfiles = profilesResult.data || []
    const linkedMetrics = metricsResult.data || []

    return NextResponse.json({
      canDelete: linkedProfiles.length === 0 && linkedMetrics.length === 0,
      linkedRecords: {
        profiles: linkedProfiles.length,
        metrics: linkedMetrics.length,
        profileDetails: linkedProfiles.slice(0, 5), // Первые 5 для показа
      }
    })
  } catch (error: unknown) {
    console.error("GET /api/system/branches/[id]/check-usage", error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : "Internal error" 
    }, { status: 500 })
  }
}
