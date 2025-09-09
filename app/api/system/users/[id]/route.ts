import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { USER_ROLES, TEACHER_CATEGORIES, isTeacherRole } from "@/lib/constants/user-management"

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const body = await request.json()
    const id = params.id
    const updates: any = {}
    
    // Получаем текущие данные пользователя для проверки роли
    const { data: currentUser, error: fetchError } = await supabaseAdmin
      .from("profiles")
      .select("role")
      .eq("user_id", id)
      .single()
    
    if (fetchError) throw fetchError
    
    // Валидация роли
    if (body.role) {
      if (!USER_ROLES.includes(body.role)) {
        return NextResponse.json({ error: "Invalid role" }, { status: 400 })
      }
      updates.role = body.role
    }
    
    // Валидация категории
    if (body.category !== undefined) {
      if (body.category) {
        if (!TEACHER_CATEGORIES.includes(body.category)) {
          return NextResponse.json({ error: "Invalid category" }, { status: 400 })
        }
      }
      updates.category = body.category || null
    }
    
    // Валидация: category обязательна для Teacher/Senior Teacher
    if (updates.role) {
      if (isTeacherRole(updates.role) && !updates.category) {
        return NextResponse.json({ error: "Category is required for Teacher and Senior Teacher roles" }, { status: 400 })
      }
      // Если роль меняется на не-учителя, очищаем category
      if (!isTeacherRole(updates.role)) {
        updates.category = null
      }
    }
    
    if (body.branch_id !== undefined) updates.branch_id = body.branch_id || null
    
    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No valid updates provided" }, { status: 400 })
    }
    
    const { error } = await supabaseAdmin.from("profiles").update(updates).eq("user_id", id)
    if (error) throw error
    
    // Если изменился branch_id для учителя, обновляем teacher_metrics
    const finalRole = updates.role || currentUser.role
    if (updates.branch_id !== undefined && isTeacherRole(finalRole)) {
      const { error: metricsError } = await supabaseAdmin
        .from("teacher_metrics")
        .update({ branch_id: updates.branch_id })
        .eq("teacher_id", id)
      
      if (metricsError) {
        console.warn("Failed to update teacher_metrics branch_id:", metricsError)
        // Не блокируем основную операцию, но логируем предупреждение
      }
    }
    
    return NextResponse.json({ ok: true })
  } catch (error: any) {
    console.error("PATCH /api/system/users/[id]", error)
    return NextResponse.json({ error: error.message ?? "Internal error" }, { status: 500 })
  }
}


