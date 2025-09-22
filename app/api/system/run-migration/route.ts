import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase/admin"

export async function POST() {
  try {
    // SQL для исправления VIEW
    const migrationSQL = `
      -- Исправляем view для Teacher Leaderboard чтобы показывать ВСЕХ преподавателей
      -- Источник истины: profiles, а не current_scores
      -- Это устраняет дублирование записей

      CREATE OR REPLACE VIEW api_v1.vw_leaderboard_teacher_overall_all AS
      SELECT
        p.user_id as teacher_id,
        COALESCE(p.full_name, p.email) as name,
        p.category,
        b.id as branch_id,
        b.name as branch_name,
        tm.return_pct,
        tm.trial_pct,
        COALESCE(cs.score, 0) as score,
        COALESCE(cs.rank, 999) as rank,
        COALESCE(cs.updated_at, now()) as updated_at,
        CASE 
          WHEN cs.rank IS NOT NULL AND s.rank IS NOT NULL THEN (cs.rank - s.rank)
          ELSE NULL
        END as delta_rank,
        CASE 
          WHEN cs.score IS NOT NULL AND s.score IS NOT NULL THEN (cs.score - s.score)
          ELSE NULL
        END as delta_score,
        NULL::text as prize
      FROM public.profiles p
      LEFT JOIN public.teacher_metrics tm ON tm.teacher_id = p.user_id
      LEFT JOIN public.branch b ON b.id = p.branch_id
      LEFT JOIN public.current_scores cs ON cs.teacher_id = p.user_id 
        AND cs.scope = 'teacher_overall' 
        AND cs.context = 'all'
      LEFT JOIN LATERAL (
        SELECT s2.rank, s2.score
        FROM public.snapshots s2
        WHERE s2.scope = 'teacher_overall' AND s2.context = 'all' AND s2.teacher_id = p.user_id
        ORDER BY s2.created_at DESC
        LIMIT 1
      ) s ON true
      WHERE p.role = 'Teacher'
      ORDER BY 
        CASE WHEN cs.rank IS NULL THEN 1 ELSE 0 END,
        COALESCE(cs.rank, 999) ASC;
    `

    // Попробуем через транзакцию
    const { error } = await supabaseAdmin.from('profiles').select('user_id').limit(1)
    
    if (error) {
      throw new Error(`Database connection failed: ${error.message}`)
    }

    // Возвращаем SQL для ручного выполнения
    return NextResponse.json({
      success: false,
      message: "Migration requires manual SQL execution",
      instructions: "Please execute the following SQL in your Supabase Dashboard → SQL Editor:",
      sql: migrationSQL.trim(),
      explanation: "This will replace the teacher leaderboard view to show ALL teachers from profiles table instead of only those in current_scores, eliminating duplicates."
    })

  } catch (error: unknown) {
    console.error("[MIGRATION] Failed:", error)
    return NextResponse.json({ 
      success: false, 
      error: error.message,
      suggestion: "Check database connection and permissions"
    }, { status: 500 })
  }
}