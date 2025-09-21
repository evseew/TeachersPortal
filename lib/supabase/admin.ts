import { createClient, type SupabaseClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.SUPABASE_URL ?? ""
const supabaseServiceRole = process.env.SUPABASE_SERVICE_ROLE ?? ""

export const supabaseAdmin: SupabaseClient = createClient(supabaseUrl, supabaseServiceRole, {
  auth: { persistSession: false },
})

export const supabaseApiV1 = createClient(supabaseUrl, supabaseServiceRole, {
  auth: { persistSession: false },
  db: { schema: "api_v1" },
})

export async function ensureProfile(args: { email: string; avatarUrl?: string | null; fullName?: string | null }) {
  const { email, avatarUrl = null, fullName = null } = args
  const { error } = await supabaseAdmin.rpc("ensure_profile", {
    p_email: email,
    p_avatar_url: avatarUrl,
    p_full_name: fullName,
  })
  if (error) throw error
}


