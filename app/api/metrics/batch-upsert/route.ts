import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase/admin"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const rows = Array.isArray(body) ? body : body?.rows
    const editorEmail = body?.editorEmail || "system@planetenglish.ru"
    if (!Array.isArray(rows)) {
      return NextResponse.json({ error: "Body must be array or {rows}[]" }, { status: 400 })
    }
    const { error, data } = await supabaseAdmin.rpc("metrics_batch_upsert", {
      p_rows: rows,
      p_editor: editorEmail,
    })
    if (error) throw error
    return NextResponse.json({ affected: data ?? 0 })
  } catch (error: any) {
    console.error("/api/metrics/batch-upsert error", error)
    return NextResponse.json({ error: error.message ?? "Internal error" }, { status: 500 })
  }
}


