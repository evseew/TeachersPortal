import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase/admin"

export async function POST() {
  try {
    if (process.env.NODE_ENV === "production") {
      return NextResponse.json({ error: "Forbidden in production" }, { status: 403 })
    }

    // Полная очистка связанных с преподавателями данных
    // 1) current_scores для teacher_overall
    const { error: csErr } = await supabaseAdmin
      .from("current_scores")
      .delete()
      .eq("scope", "teacher_overall")
      .eq("context", "all")
    if (csErr) throw csErr

    // 2) snapshots для teacher_overall
    const { error: snErr } = await supabaseAdmin
      .from("snapshots")
      .delete()
      .eq("scope", "teacher_overall")
      .eq("context", "all")
    if (snErr) throw snErr

    // 3) teacher_metrics — требуется WHERE в PostgREST
    const { error: tmErr } = await supabaseAdmin
      .from("teacher_metrics")
      .delete()
      .not("teacher_id", "is", null)
    if (tmErr) throw tmErr

    // 4) profiles с ролью Teacher
    const { error: pfErr } = await supabaseAdmin
      .from("profiles")
      .delete()
      .eq("role", "Teacher")
    if (pfErr) throw pfErr

    return NextResponse.json({ ok: true })
  } catch (error: any) {
    console.error("POST /api/system/reset-teachers", error)
    return NextResponse.json({ error: error.message ?? "Internal error" }, { status: 500 })
  }
}


