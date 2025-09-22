import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase/admin"

export async function POST(request: NextRequest) {
  // Разрешаем только в режиме разработки
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Доступно только в development' }, { status: 403 })
  }

  const devUser = {
    user_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    email: 'dev@planetenglish.ru',
    full_name: 'Dev User',
    role: 'Administrator',
    category: null, // Администратор не имеет категории
    branch_id: null, // Администратор не привязан к филиалу
    avatar_url: null
  }

  try {
    // Проверяем, существует ли уже dev пользователь
    const { data: existing } = await supabaseAdmin
      .from('profiles')
      .select('user_id')
      .eq('email', devUser.email)
      .single()

    if (existing) {
      return NextResponse.json({
        message: 'Dev пользователь уже существует',
        user: devUser
      })
    }

    // Добавляем dev пользователя
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .insert([devUser])
      .select()

    if (error) {
      throw error
    }

    return NextResponse.json({
      message: 'Dev пользователь успешно добавлен',
      user: devUser
    })

  } catch (error: unknown) {
    console.error('Ошибка при добавлении dev пользователя:', error)
    return NextResponse.json({
      error: error.message || 'Ошибка при добавлении dev пользователя'
    }, { status: 500 })
  }
}