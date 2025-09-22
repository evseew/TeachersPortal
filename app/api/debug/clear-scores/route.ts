import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase/admin"

export async function POST() {
  try {
    // Очищаем таблицу current_scores от дубликатов
    const { error: deleteError } = await supabaseAdmin
      .from("current_scores")
      .delete()
      .eq("scope", "branch_overall")
      .eq("context", "all")
    
    if (deleteError) throw deleteError
    
    // Пересчитываем ранги с нуля
    const { error: recomputeError } = await supabaseAdmin.rpc("recompute_current_scores")
    if (recomputeError) throw recomputeError
    
    return NextResponse.json({ 
      success: true, 
      message: "Branch scores cleared and recomputed" 
    })
  } catch (error: unknown) {
    console.error("Error clearing scores:", error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : "Internal error" 
    }, { status: 500 })
  }
}
