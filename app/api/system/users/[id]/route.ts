import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { TEACHER_CATEGORIES, isTeacherRole } from "@/lib/constants/user-management"
import { withAuth } from "@/lib/middleware/auth-middleware"

const updateUserHandler = async (request: NextRequest, { params }: { params: { id: string } }) => {
  try {
    const body = await request.json()
    const id = params.id
    const updates: Record<string, unknown> = {}
    
    // Получаем текущие данные пользователя для проверки роли
    const { data: currentUser, error: fetchError } = await supabaseAdmin
      .from("profiles_with_role")
      .select("role, role_id")
      .eq("user_id", id)
      .single()
    
    if (fetchError) throw fetchError
    
    // Валидация роли - теперь принимаем как role (название), так и role_id
    if (body.role_id) {
      // Если передан role_id, проверяем что роль существует
      const { data: roleExists, error: roleError } = await supabaseAdmin
        .from("roles")
        .select("id, name")
        .eq("id", body.role_id)
        .single()
      
      if (roleError || !roleExists) {
        return NextResponse.json({ error: "Invalid role_id" }, { status: 400 })
      }
      
      updates.role_id = body.role_id
    } else if (body.role) {
      // Если передано название роли, находим соответствующий role_id
      const { data: roleData, error: roleError } = await supabaseAdmin
        .from("roles")
        .select("id, name")
        .eq("name", body.role)
        .single()
      
      if (roleError || !roleData) {
        return NextResponse.json({ error: "Invalid role name" }, { status: 400 })
      }
      
      updates.role_id = roleData.id
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
    
    // Валидация: category обязательна только для Teacher (Senior Teacher это менеджер)
    if (updates.role_id) {
      // Получаем название роли для проверки
      const { data: newRole } = await supabaseAdmin
        .from("roles")
        .select("name")
        .eq("id", updates.role_id)
        .single()
      
      if (newRole) {
        const roleName = newRole.name
        if (isTeacherRole(roleName) && !body.category) {
          return NextResponse.json({ error: "Category is required for Teacher role" }, { status: 400 })
        }
        // Если роль меняется на не-учителя, очищаем category
        if (!isTeacherRole(roleName)) {
          updates.category = null
        }
      }
    }
    
    if (body.branch_id !== undefined) updates.branch_id = body.branch_id || null
    
    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No valid updates provided" }, { status: 400 })
    }
    
    const { error } = await supabaseAdmin.from("profiles").update(updates).eq("user_id", id)
    if (error) throw error
    
    // Если изменился branch_id для учителя, обновляем teacher_metrics
    if (updates.branch_id !== undefined) {
      // Определяем финальную роль после обновления
      let finalRoleName = currentUser.role
      if (updates.role_id) {
        const { data: newRole } = await supabaseAdmin
          .from("roles")
          .select("name")
          .eq("id", updates.role_id)
          .single()
        if (newRole) finalRoleName = newRole.name
      }
      
      if (isTeacherRole(finalRoleName)) {
        const { error: metricsError } = await supabaseAdmin
          .from("teacher_metrics")
          .update({ branch_id: updates.branch_id })
          .eq("teacher_id", id)
        
        if (metricsError) {
          console.warn("Failed to update teacher_metrics branch_id:", metricsError)
          // Не блокируем основную операцию, но логируем предупреждение
        }
      }
    }
    
    return NextResponse.json({ ok: true })
  } catch (error: unknown) {
    console.error("PATCH /api/system/users/[id]", error)
    return NextResponse.json({ error: error instanceof Error ? error.message : "Internal error" }, { status: 500 })
  }
}

const deleteUserHandler = async (request: NextRequest, { params }: { params: { id: string } }) => {
  try {
    const id = params.id
    
    // Проверяем, существует ли пользователь
    const { data: user, error: fetchError } = await supabaseAdmin
      .from("profiles")
      .select("user_id, email, role")
      .eq("user_id", id)
      .single()
    
    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        return NextResponse.json({ error: "User not found" }, { status: 404 })
      }
      throw fetchError
    }
    
    // Проверяем, можно ли удалить пользователя
    // Например, нельзя удалить последнего администратора
    if (user.role === "Administrator") {
      const { data: adminCount, error: countError } = await supabaseAdmin
        .from("profiles")
        .select("user_id", { count: "exact" })
        .eq("role", "Administrator")
      
      if (countError) throw countError
      
      if ((adminCount as unknown[])?.length <= 1) {
        return NextResponse.json({ 
          error: "Cannot delete the last administrator" 
        }, { status: 400 })
      }
    }
    
    // Удаляем пользователя (каскадное удаление настроено через FK constraints)
    const { error } = await supabaseAdmin
      .from("profiles")
      .delete()
      .eq("user_id", id)
    
    if (error) throw error
    
    return NextResponse.json({ 
      ok: true, 
      message: `User ${user.email} deleted successfully` 
    })
  } catch (error: unknown) {
    console.error("DELETE /api/system/users/[id]", error)
    return NextResponse.json({ error: error instanceof Error ? error.message : "Internal error" }, { status: 500 })
  }
}

// Применяем middleware с авторизацией
export const PATCH = withAuth({
  requireAuth: true,
  allowedRoles: ["Administrator"]
})(updateUserHandler)

export const DELETE = withAuth({
  requireAuth: true,
  allowedRoles: ["Administrator"]
})(deleteUserHandler)


