import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { withAuth } from "@/lib/middleware/auth-middleware"
import { ScoreRecomputationService } from "@/lib/services/score-recomputation.service"

const batchUpsertHandler = async (request: NextRequest) => {
  try {
    const body = await request.json()
    const rows = Array.isArray(body) ? body : body?.rows
    const editorEmail = body?.editorEmail || "system@planetenglish.ru"
    if (!Array.isArray(rows)) {
      return NextResponse.json({ error: "Body must be array or {rows}[]" }, { status: 400 })
    }
    // Вызываем RPC функцию (она автоматически пересчитывает рейтинги)
    const { error, data } = await supabaseAdmin.rpc("metrics_batch_upsert", {
      p_rows: rows,
      p_editor: editorEmail,
    })
    if (error) throw error

    // Дополнительный интеллектуальный пересчет через новый сервис
    // Это обеспечивает консистентность если RPC функция по какой-то причине не сработала
    const recomputationService = ScoreRecomputationService.getInstance()
    const recomputeResult = await recomputationService.recomputeIfNeeded('metrics-batch-upsert', {
      skipIfRecent: true,
      maxFrequency: 5000 // Не чаще чем раз в 5 секунд
    })

    console.log(`📊 [API] batch-upsert: Обработано ${data} записей, дополнительный пересчет: ${recomputeResult.executed ? 'выполнен' : 'пропущен'}`)

    return NextResponse.json({ 
      affected: data ?? 0,
      recomputation: {
        executed: recomputeResult.executed,
        reason: recomputeResult.reason
      }
    })
  } catch (error: any) {
    console.error("/api/metrics/batch-upsert error", error)
    return NextResponse.json({ error: error.message ?? "Internal error" }, { status: 500 })
  }
}

// Применяем middleware с авторизацией
export const POST = withAuth({
  requireAuth: true,
  allowedRoles: ["Administrator", "Senior Teacher"]
})(batchUpsertHandler)


