import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase/admin"

export async function POST() {
  try {
    // 1. Получаем всех преподавателей из profiles
    const { data: teachers, error: teachersError } = await supabaseAdmin
      .from("profiles")
      .select("user_id, full_name, email, role, category, branch_id")
      .eq("role", "Teacher")
      .order("full_name")

    if (teachersError) throw teachersError

    // 2. Получаем текущие данные из current_scores для преподавателей
    const { data: currentScores, error: scoresError } = await supabaseAdmin
      .from("current_scores")
      .select("teacher_id, score, rank")
      .eq("scope", "teacher_overall")
      .eq("context", "all")
      .not("teacher_id", "is", null)

    if (scoresError) throw scoresError

    // 3. Найдём фантомных пользователей (есть в current_scores, но нет в profiles)
    const teacherIds = new Set(teachers?.map(t => t.user_id) || [])
    const phantomScores = currentScores?.filter(cs => !teacherIds.has(cs.teacher_id)) || []
    
    // 4. Удаляем фантомных пользователей из current_scores
    if (phantomScores.length > 0) {
      const phantomIds = phantomScores.map(ps => ps.teacher_id)
      const { error: deleteError } = await supabaseAdmin
        .from("current_scores")
        .delete()
        .eq("scope", "teacher_overall")
        .eq("context", "all")
        .in("teacher_id", phantomIds)

      if (deleteError) throw deleteError
    }

    // 5. Найдём отсутствующих преподавателей
    const existingTeacherIds = new Set(currentScores?.map(cs => cs.teacher_id) || [])
    const missingTeachers = teachers?.filter(t => !existingTeacherIds.has(t.user_id)) || []

    // 6. Добавляем отсутствующих преподавателей в current_scores и teacher_metrics
    if (missingTeachers.length > 0) {
      // Сначала добавляем в teacher_metrics (если нет)
      for (const teacher of missingTeachers) {
        const { error: metricsError } = await supabaseAdmin
          .from("teacher_metrics")
          .upsert({
            teacher_id: teacher.user_id,
            branch_id: teacher.branch_id,
            last_year_base: 0,
            last_year_returned: 0,
            trial_total: 0,
            trial_converted: 0,
            updated_by: "sync"
          }, { onConflict: "teacher_id" })

        if (metricsError) {
          console.error(`[SYNC] Error upserting metrics for ${teacher.full_name}:`, metricsError)
        }
      }

      // Затем пересчитываем рейтинги
      const { error: recomputeError } = await supabaseAdmin.rpc("recompute_current_scores")
      if (recomputeError) {
        console.error("[SYNC] Error recomputing scores:", recomputeError)
        throw recomputeError
      }
    }

    // 7. Получаем обновлённые данные
    const { data: updatedScores, error: updatedError } = await supabaseAdmin
      .from("current_scores")
      .select("teacher_id, score, rank")
      .eq("scope", "teacher_overall")
      .eq("context", "all")
      .not("teacher_id", "is", null)

    if (updatedError) throw updatedError

    return NextResponse.json({
      success: true,
      teachers_in_profiles: teachers?.length || 0,
      phantom_users_removed: phantomScores.length,
      missing_teachers_added: missingTeachers.length,
      final_teacher_count: updatedScores?.length || 0,
      details: {
        phantoms_removed: phantomScores.map(p => p.teacher_id),
        teachers_added: missingTeachers.map(t => ({ id: t.user_id, name: t.full_name }))
      }
    })

  } catch (error: any) {
    console.error("[SYNC] Synchronization failed:", error)
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 })
  }
}
