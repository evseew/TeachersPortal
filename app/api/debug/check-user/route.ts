import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase/admin"

export async function GET(request: NextRequest) {
  try {
    const email = request.nextUrl.searchParams.get('email') || 'dev@planetenglish.ru'
    
    console.log(`🔍 Проверяем пользователя ${email} в базе данных...`)

    // Проверяем в таблице profiles
    const { data: profileData, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('email', email)
      .single()

    const result = {
      email,
      timestamp: new Date().toISOString(),
      profile: {
        found: !profileError,
        error: profileError?.message || null,
        data: profileData || null
      }
    }

    if (profileError) {
      console.log(`❌ Ошибка при запросе profiles: ${profileError.message}`)
    } else if (profileData) {
      console.log(`✅ Пользователь найден в profiles:`)
      console.log(`   - user_id: ${profileData.user_id}`)
      console.log(`   - email: ${profileData.email}`)
      console.log(`   - full_name: ${profileData.full_name}`)
      console.log(`   - role: ${profileData.role}`)
      console.log(`   - branch_id: ${profileData.branch_id}`)
      console.log(`   - category: ${profileData.category}`)
    } else {
      console.log(`❌ Пользователь НЕ найден в profiles`)
    }

    // Дополнительная проверка - все пользователи с похожим email
    const { data: allProfiles, error: allError } = await supabaseAdmin
      .from('profiles')
      .select('email, role, full_name')
      .ilike('email', '%dev%')

    result.similarUsers = {
      found: !allError,
      error: allError?.message || null,
      data: allProfiles || []
    }

    // Проверяем админов
    const { data: adminUsers, error: adminError } = await supabaseAdmin
      .from('profiles')
      .select('email, full_name, role')
      .eq('role', 'Administrator')

    result.administrators = {
      found: !adminError,
      error: adminError?.message || null,
      data: adminUsers || []
    }

    return NextResponse.json(result, { status: 200 })

  } catch (error: any) {
    console.error("💥 Ошибка API:", error)
    return NextResponse.json({
      error: error.message,
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}
