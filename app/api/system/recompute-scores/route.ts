import { NextResponse } from "next/server"
import { ScoreRecomputationService } from "@/lib/services/score-recomputation.service"

export async function POST(request: Request) {
  try {
    console.log("🔄 [API] recompute-scores: Запуск пересчета...")
    
    // Получаем параметры из query string
    const { searchParams } = new URL(request.url)
    const force = searchParams.get('force') === 'true'
    const scope = searchParams.get('scope') as 'teacher_overall' | 'branch_overall' | 'all' | null
    
    const recomputationService = ScoreRecomputationService.getInstance()
    
    const result = await recomputationService.recomputeIfNeeded('manual-api-call', {
      force,
      scope: scope || 'all'
    })
    
    if (result.executed) {
      console.log(`✅ [API] recompute-scores: Пересчет выполнен за ${result.duration}ms`)
      return NextResponse.json({ 
        ok: true, 
        message: "Scores recomputed successfully",
        details: {
          executed: true,
          duration: result.duration,
          teacherChanges: result.teacherChanges,
          branchChanges: result.branchChanges,
          scope: scope || 'all',
          forced: force
        }
      })
    } else {
      console.log(`⏭️ [API] recompute-scores: Пересчет пропущен - ${result.reason}`)
      return NextResponse.json({ 
        ok: true, 
        message: "Recomputation skipped",
        details: {
          executed: false,
          reason: result.reason,
          scope: scope || 'all',
          forced: force
        }
      })
    }
    
  } catch (error: any) {
    console.error("❌ [API] recompute-scores: Ошибка пересчета:", error)
    return NextResponse.json({ 
      ok: false,
      error: error.message ?? "Internal error" 
    }, { status: 500 })
  }
}
