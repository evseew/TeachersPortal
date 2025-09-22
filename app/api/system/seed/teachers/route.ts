import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase/admin"

type SeedBody = {
  branch_id?: string | null
  branch_name?: string | null
  count?: number
}

export async function POST(req: Request) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Forbidden in production" }, { status: 403 })
  }

  try {
    const body = (await req.json().catch(() => ({}))) as SeedBody
    const desiredCount = Math.max(1, Math.min(20, Number(body.count ?? 3)))

    // 1) Определим филиал: по id, по имени или возьмём последний созданный
    let targetBranchId: string | null = body.branch_id ?? null
    if (!targetBranchId && body.branch_name) {
      const { data: byName } = await supabaseAdmin
        .from("branch")
        .select("id,name")
        .ilike("name", body.branch_name)
        .limit(1)
        .maybeSingle()
      targetBranchId = byName?.id ?? null
    }
    if (!targetBranchId) {
      const { data: lastBranch } = await supabaseAdmin
        .from("branch")
        .select("id,name,created_at")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle()
      targetBranchId = lastBranch?.id ?? null
    }

    if (!targetBranchId) {
      return NextResponse.json({ error: "No branch found to assign teachers" }, { status: 400 })
    }

    // 2) Сгенерируем мок-данные преподавателей
    const now = Date.now()
    const categories = ["Senior", "Middle", "Junior", "Newcomer"] as const
    const names = [
      "Иванова Мария",
      "Петров Алексей",
      "Сидорова Анна",
      "Кузнецов Дмитрий",
      "Смирнова Ольга",
    ]

    const teachers = Array.from({ length: desiredCount }).map((_, i) => {
      const idx = i % names.length
      const cat = categories[i % categories.length]
      const email = `seed.teacher.${now}.${i}@example.com`
      const full_name = names[idx]
      return { email, full_name, category: cat }
    })

    // 3) Создадим/обновим профили (RPC ensure_profile) и соберём user_id
    const created: Array<{ user_id: string; email: string; full_name: string; category: string }> = []
    for (const t of teachers) {
      const { data, error } = await supabaseAdmin.rpc("ensure_profile", {
        p_email: t.email,
        p_avatar_url: null,
        p_full_name: t.full_name,
      })
      if (error) throw error
      // Назначим роль/категорию/филиал в profiles
      const { error: updErr } = await supabaseAdmin
        .from("profiles")
        .update({ role: "Teacher", category: t.category, branch_id: targetBranchId })
        .eq("user_id", (data as Record<string, unknown>).user_id)
      if (updErr) throw updErr
      created.push({
        user_id: (data as Record<string, unknown>).user_id,
        email: (data as Record<string, unknown>).email,
        full_name: (data as Record<string, unknown>).full_name ?? t.full_name,
        category: t.category,
      })
    }

    // 4) Сгенерируем KPI и запишем в teacher_metrics с branch_id
    //    (в RPC metrics_batch_upsert нельзя передать branch_id, поэтому апдейтим напрямую)
    const metricsRows = created.map((u, i) => {
      const last_year_base = 50 + i * 5
      const last_year_returned = Math.max(0, Math.min(last_year_base, Math.round(last_year_base * 0.8)))
      const trial_total = 20 + i * 3
      const trial_converted = Math.max(0, Math.min(trial_total, Math.round(trial_total * 0.7)))
      return {
        teacher_id: u.user_id,
        branch_id: targetBranchId,
        last_year_base,
        last_year_returned,
        trial_total,
        trial_converted,
        updated_by: "seed",
      }
    })

    const { error: upsertErr } = await supabaseAdmin
      .from("teacher_metrics")
      .upsert(metricsRows, { onConflict: "teacher_id" })
    if (upsertErr) throw upsertErr

    // 5) Пересчёт рейтингов
    const { error: recErr } = await supabaseAdmin.rpc("recompute_current_scores")
    if (recErr) throw recErr

    return NextResponse.json({ ok: true, branch_id: targetBranchId, teachers: created })
  } catch (error: unknown) {
    console.error("POST /api/system/seed/teachers", error)
    return NextResponse.json({ error: error instanceof Error ? error.message : "Internal error" }, { status: 500 })
  }
}



