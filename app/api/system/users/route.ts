import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { withAuth } from "@/lib/middleware/auth-middleware"

// Принудительно делаем route динамическим для обработки авторизации
export const dynamic = 'force-dynamic'

const getUsersHandler = async (request: NextRequest) => {
  try {
    // Получаем параметры поиска
    const { searchParams } = new URL(request.url)
    const q = (searchParams.get("q") ?? "").toLowerCase()
    const { data, error } = await supabaseAdmin
      .from("profiles_with_role")
      .select("user_id, email, full_name, role, category, branch_id, avatar_url, role_id, permissions, branch:branch_id(name)")
      .order("full_name", { ascending: true })
    if (error) throw error
    const mapped = (data ?? []).map((r: Record<string, unknown>) => ({
      user_id: r.user_id,
      email: r.email,
      full_name: r.full_name ?? r.email,
      role: r.role,
      category: r.category,
      branch_id: r.branch_id,
      avatar_url: r.avatar_url,
      branch_name: (r.branch as any)?.name ?? null,
    }))
    const filtered = q
      ? mapped.filter(
          (u: Record<string, unknown>) =>
            String(u.full_name).toLowerCase().includes(q) || String(u.email).toLowerCase().includes(q) || String(u.branch_name ?? "").toLowerCase().includes(q),
        )
      : mapped
    return NextResponse.json(filtered)
  } catch (error: unknown) {
    console.error("GET /api/system/users", error)
    const errorMessage = error instanceof Error ? error.message : "Internal error"
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}

// Применяем middleware с авторизацией
export const GET = withAuth({
  requireAuth: true,
  allowedRoles: ["Administrator", "Head of Sales"]
})(getUsersHandler)


