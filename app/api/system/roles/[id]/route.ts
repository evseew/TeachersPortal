import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { withAuth } from "@/lib/middleware/auth-middleware"
import { withErrorHandler } from "@/lib/middleware/api-error-handler"
import { type UpdateRoleRequest } from "@/lib/types/roles"

/**
 * GET /api/system/roles/[id] - получить роль по ID
 */
const getRoleHandler = async (request: NextRequest, { params }: { params: { id: string } }) => {
  try {
    const { data, error } = await supabaseAdmin
      .from("roles")
      .select("*")
      .eq("id", params.id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: "Role not found" }, { status: 404 })
      }
      throw error
    }

    return NextResponse.json(data)
  } catch (error: unknown) {
    console.error("GET /api/system/roles/[id]", error)
    return NextResponse.json({ error: error instanceof Error ? error.message : "Internal error" }, { status: 500 })
  }
}

/**
 * PATCH /api/system/roles/[id] - обновить роль
 */
const updateRoleHandler = async (request: NextRequest, { params }: { params: { id: string } }) => {
  try {
    const body: Omit<UpdateRoleRequest, 'id'> = await request.json()

    // Получаем текущую роль
    const { data: currentRole, error: fetchError } = await supabaseAdmin
      .from("roles")
      .select("*")
      .eq("id", params.id)
      .single()

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        return NextResponse.json({ error: "Role not found" }, { status: 404 })
      }
      throw fetchError
    }

    const updates: Record<string, unknown> = {}

    // Валидация и подготовка обновлений
    if (body.name !== undefined) {
      if (!body.name.trim()) {
        return NextResponse.json({ error: "Role name cannot be empty" }, { status: 400 })
      }
      
      if (body.name.length < 2 || body.name.length > 50) {
        return NextResponse.json({ error: "Role name must be 2-50 characters" }, { status: 400 })
      }

      // Проверяем уникальность имени (если изменяется)
      if (body.name.trim() !== currentRole.name) {
        const { data: existing } = await supabaseAdmin
          .from("roles")
          .select("id")
          .eq("name", body.name.trim())
          .neq("id", params.id)
          .single()

        if (existing) {
          return NextResponse.json({ error: "Role with this name already exists" }, { status: 409 })
        }
      }

      updates.name = body.name.trim()
    }

    if (body.description !== undefined) {
      if (!body.description.trim()) {
        return NextResponse.json({ error: "Role description cannot be empty" }, { status: 400 })
      }

      if (body.description.length < 5 || body.description.length > 200) {
        return NextResponse.json({ error: "Role description must be 5-200 characters" }, { status: 400 })
      }

      updates.description = body.description.trim()
    }

    if (body.color !== undefined) {
      updates.color = body.color
    }

    if (body.permissions !== undefined) {
      updates.permissions = body.permissions
    }

    // Если нет изменений
    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No valid updates provided" }, { status: 400 })
    }

    // Обновляем роль
    const { data, error } = await supabaseAdmin
      .from("roles")
      .update(updates)
      .eq("id", params.id)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json(data)
  } catch (error: unknown) {
    console.error("PATCH /api/system/roles/[id]", error)
    return NextResponse.json({ error: error instanceof Error ? error.message : "Internal error" }, { status: 500 })
  }
}

/**
 * DELETE /api/system/roles/[id] - удалить роль
 */
const deleteRoleHandler = async (request: NextRequest, { params }: { params: { id: string } }) => {
  try {
    // Получаем роль для проверки
    const { data: role, error: fetchError } = await supabaseAdmin
      .from("roles")
      .select("id, name, is_system")
      .eq("id", params.id)
      .single()

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        return NextResponse.json({ error: "Role not found" }, { status: 404 })
      }
      throw fetchError
    }

    // Нельзя удалять системные роли
    if (role.is_system) {
      return NextResponse.json({ 
        error: "Cannot delete system roles" 
      }, { status: 400 })
    }

    // Проверяем, не используется ли роль пользователями
    // Безопасная проверка - если роль не существует в enum, то точно не используется
    let userCount = 0
    try {
      const { data: users, error: usersError } = await supabaseAdmin
        .from("profiles")
        .select("user_id", { count: "exact" })
        .eq("role", role.name)

      if (usersError) {
        // Если ошибка из-за enum (роль не в старом enum), то пользователей точно нет
        if (usersError.message?.includes('invalid input value for enum')) {
          userCount = 0
        } else {
          throw usersError
        }
      } else {
        userCount = (users as unknown[])?.length || 0
      }
    } catch (error: unknown) {
      // Если ошибка enum - роль точно не используется пользователями
      if (error.message?.includes('invalid input value for enum')) {
        userCount = 0
      } else {
        throw error
      }
    }

    if (userCount > 0) {
      return NextResponse.json({ 
        error: `Cannot delete role "${role.name}" - it is assigned to ${userCount} user(s)` 
      }, { status: 400 })
    }

    // Удаляем роль
    const { error } = await supabaseAdmin
      .from("roles")
      .delete()
      .eq("id", params.id)

    if (error) throw error

    return NextResponse.json({ 
      ok: true, 
      message: `Role "${role.name}" deleted successfully` 
    })
  } catch (error: unknown) {
    console.error("DELETE /api/system/roles/[id]", error)
    return NextResponse.json({ error: error instanceof Error ? error.message : "Internal error" }, { status: 500 })
  }
}

// Применяем middleware с авторизацией
export const GET = withAuth({
  requireAuth: true,
  allowedRoles: ["Administrator", "Head of Sales"]
})(withErrorHandler(getRoleHandler))

export const PATCH = withAuth({
  requireAuth: true,
  allowedRoles: ["Administrator"]
})(withErrorHandler(updateRoleHandler))

export const DELETE = withAuth({
  requireAuth: true,
  allowedRoles: ["Administrator"]
})(withErrorHandler(deleteRoleHandler))
