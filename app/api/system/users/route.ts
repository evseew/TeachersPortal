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
      .from("profiles")
      .select("user_id, email, full_name, role, category, branch_id, avatar_url, branch:branch_id(name)")
      .order("full_name", { ascending: true })
    if (error) throw error
    const mapped = (data ?? []).map((r: any) => ({
      user_id: r.user_id,
      email: r.email,
      full_name: r.full_name ?? r.email,
      role: r.role,
      category: r.category,
      branch_id: r.branch_id,
      avatar_url: r.avatar_url,
      branch_name: r.branch?.name ?? null,
    }))
    const filtered = q
      ? mapped.filter(
          (u: any) =>
            u.full_name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q) || (u.branch_name ?? "").toLowerCase().includes(q),
        )
      : mapped
    return NextResponse.json(filtered)
  } catch (error: any) {
    console.error("GET /api/system/users", error)
    return NextResponse.json({ error: error.message ?? "Internal error" }, { status: 500 })
  }
}

// Применяем middleware с авторизацией
export const GET = withAuth({
  requireAuth: true,
  allowedRoles: ["Administrator", "Head of Sales"]
})(getUsersHandler)


