import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase/admin"

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin.from("branch").select("id,name").order("name")
    if (error) throw error
    return NextResponse.json(data)
  } catch (error: any) {
    console.error("GET /api/system/branches", error)
    return NextResponse.json({ error: error.message ?? "Internal error" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const name = (body?.name ?? "").toString().trim()
    if (!name) return NextResponse.json({ error: "name required" }, { status: 400 })
    const { data, error } = await supabaseAdmin.from("branch").insert({ name }).select("id,name").single()
    if (error) throw error
    return NextResponse.json(data)
  } catch (error: any) {
    console.error("POST /api/system/branches", error)
    return NextResponse.json({ error: error.message ?? "Internal error" }, { status: 500 })
  }
}


