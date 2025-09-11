import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { requireAuth, hasServerRole } from "@/lib/auth/server-auth"

export async function GET(request: Request) {
  // Проверяем авторизацию
  const authError = await requireAuth()
  if (authError) return authError
  
  // Проверяем роль (Admin или Head of Sales могут просматривать пользователей)
  const hasPermission = await hasServerRole(["Administrator", "Head of Sales"])
  if (!hasPermission) {
    return NextResponse.json(
      { error: "Недостаточно прав для просмотра пользователей" }, 
      { status: 403 }
    )
  }
  try {
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


