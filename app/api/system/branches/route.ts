import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase/admin"

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin.from("branch").select("id,name").order("name")
    if (error) throw error
    return NextResponse.json(data)
  } catch (error: unknown) {
    console.error("GET /api/system/branches", error)
    const errorMessage = error instanceof Error ? error.message : "Internal error"
    return NextResponse.json({ error: errorMessage }, { status: 500 })
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
  } catch (error: unknown) {
    console.error("POST /api/system/branches", error)
    const errorMessage = error instanceof Error ? error.message : "Internal error"
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}


