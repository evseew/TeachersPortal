import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { isTeacherRole } from "@/lib/constants/user-management"

export async function POST() {
  try {
    // 1. Получаем всех учителей из profiles
    const { data: teachers, error: teachersError } = await supabaseAdmin
      .from("profiles")
      .select("user_id, full_name, role, branch_id")
      .or("role.eq.Teacher,role.eq.Senior Teacher")
      .order("full_name")

    if (teachersError) throw teachersError

    // 2. Получаем все записи teacher_metrics
    const { data: metrics, error: metricsError } = await supabaseAdmin
      .from("teacher_metrics")
      .select("teacher_id, branch_id")

    if (metricsError) throw metricsError

    // 3. Найдем несоответствия
    const mismatches = []
    const updates = []

    for (const teacher of teachers || []) {
      const metric = metrics?.find(m => m.teacher_id === teacher.user_id)
      
      if (metric && metric.branch_id !== teacher.branch_id) {
        mismatches.push({
          teacher_id: teacher.user_id,
          teacher_name: teacher.full_name,
          profile_branch_id: teacher.branch_id,
          metrics_branch_id: metric.branch_id
        })

        updates.push({
          teacher_id: teacher.user_id,
          branch_id: teacher.branch_id
        })
      }
    }

    // 4. Обновляем teacher_metrics
    let updatedCount = 0
    const errors = []

    for (const update of updates) {
      const { error } = await supabaseAdmin
        .from("teacher_metrics")
        .update({ branch_id: update.branch_id })
        .eq("teacher_id", update.teacher_id)

      if (error) {
        errors.push({
          teacher_id: update.teacher_id,
          error: error.message
        })
      } else {
        updatedCount++
      }
    }

    return NextResponse.json({
      success: true,
      total_teachers: teachers?.length || 0,
      mismatches_found: mismatches.length,
      records_updated: updatedCount,
      errors_count: errors.length,
      details: {
        mismatches,
        errors
      }
    })

  } catch (error: unknown) {
    console.error("[FIX-BRANCHES] Operation failed:", error)
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 })
  }
}
