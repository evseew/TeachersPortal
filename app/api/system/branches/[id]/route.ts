import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase/admin"

export async function PATCH(_: Request, { params }: { params: { id: string } }) {
  try {
    const url = new URL(_.url)
    const body = await _.json().catch(() => ({}))
    const id = params.id
    const name = (body?.name ?? url.searchParams.get("name") ?? "").toString().trim()
    if (!id || !name) return NextResponse.json({ error: "id and name required" }, { status: 400 })
    const { data, error } = await supabaseAdmin.from("branch").update({ name }).eq("id", id).select("id,name").single()
    if (error) throw error
    return NextResponse.json(data)
  } catch (error: any) {
    console.error("PATCH /api/system/branches/[id]", error)
    return NextResponse.json({ error: error.message ?? "Internal error" }, { status: 500 })
  }
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  try {
    const id = params.id
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 })
    const { error } = await supabaseAdmin.from("branch").delete().eq("id", id)
    if (error) throw error
    return NextResponse.json({ ok: true })
  } catch (error: any) {
    console.error("DELETE /api/system/branches/[id]", error)
    return NextResponse.json({ error: error.message ?? "Internal error" }, { status: 500 })
  }
}


