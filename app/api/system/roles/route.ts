import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { withAuth } from "@/lib/middleware/auth-middleware"
import { withErrorHandler } from "@/lib/middleware/api-error-handler"
import { type CreateRoleRequest, ROLE_COLORS } from "@/lib/types/roles"

// Принудительно делаем route динамическим
export const dynamic = 'force-dynamic'

/**
 * GET /api/system/roles - получить все роли
 */
const getRolesHandler = async (request: NextRequest) => {
  try {
    const { data, error } = await supabaseAdmin
      .from("roles")
      .select("*")
      .order("is_system", { ascending: false }) // системные роли первыми
      .order("name", { ascending: true })

    if (error) throw error

    return NextResponse.json(data || [])
  } catch (error: unknown) {
    console.error("GET /api/system/roles", error)
    return NextResponse.json({ error: error instanceof Error ? error.message : "Internal error" }, { status: 500 })
  }
}

/**
 * POST /api/system/roles - создать новую роль
 */
const createRoleHandler = async (request: NextRequest) => {
  try {
    const body: CreateRoleRequest = await request.json()
    
    // Валидация
    if (!body.name?.trim()) {
      return NextResponse.json({ error: "Role name is required" }, { status: 400 })
    }
    
    if (!body.description?.trim()) {
      return NextResponse.json({ error: "Role description is required" }, { status: 400 })
    }

    if (body.name.length < 2 || body.name.length > 50) {
      return NextResponse.json({ error: "Role name must be 2-50 characters" }, { status: 400 })
    }

    if (body.description.length < 5 || body.description.length > 200) {
      return NextResponse.json({ error: "Role description must be 5-200 characters" }, { status: 400 })
    }

    // Проверяем уникальность имени
    const { data: existing } = await supabaseAdmin
      .from("roles")
      .select("id")
      .eq("name", body.name.trim())
      .single()

    if (existing) {
      return NextResponse.json({ error: "Role with this name already exists" }, { status: 409 })
    }

    // Создаем роль
    const roleData = {
      name: body.name.trim(),
      description: body.description.trim(),
      color: body.color || ROLE_COLORS[Math.floor(Math.random() * ROLE_COLORS.length)],
      permissions: body.permissions || [],
      is_system: false, // новые роли не системные
    }

    const { data, error } = await supabaseAdmin
      .from("roles")
      .insert([roleData])
      .select()
      .single()

    if (error) throw error

    return NextResponse.json(data, { status: 201 })
  } catch (error: unknown) {
    console.error("POST /api/system/roles", error)
    return NextResponse.json({ error: error instanceof Error ? error.message : "Internal error" }, { status: 500 })
  }
}

// Применяем middleware с авторизацией
export const GET = withAuth({
  requireAuth: true,
  allowedRoles: ["Administrator", "Head of Sales"] // Head of Sales может просматривать роли
})(withErrorHandler(getRolesHandler))

export const POST = withAuth({
  requireAuth: true,
  allowedRoles: ["Administrator"] // только администратор может создавать роли
})(withErrorHandler(createRoleHandler))
