import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase/admin"

export const dynamic = "force-dynamic"

export async function GET(request: Request) {
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
    return NextResponse.json({ error: error.message ?? "Internal error" }, { status: 500 })
  }
}
