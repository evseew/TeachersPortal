import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase/admin"

export async function POST() {
  try {
    console.log("Recomputing scores...")
    const { error } = await supabaseAdmin.rpc("recompute_current_scores")
    if (error) throw error
    
    console.log("Scores recomputed successfully")
    return NextResponse.json({ ok: true, message: "Scores recomputed successfully" })
  } catch (error: any) {
    console.error("POST /api/system/recompute-scores", error)
    return NextResponse.json({ error: error.message ?? "Internal error" }, { status: 500 })
  }
}
