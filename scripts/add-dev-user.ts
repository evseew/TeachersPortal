/**
 * Скрипт для добавления dev пользователя в базу данных
 * Запуск: npx tsx scripts/add-dev-user.ts
 */

import { supabaseAdmin } from '../lib/supabase/admin'

async function addDevUser() {
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
      console.log('✅ Dev пользователь уже существует в БД:', devUser.email)
      return
    }

    // Добавляем dev пользователя
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .insert([devUser])
      .select()

    if (error) {
      throw error
    }

    console.log('✅ Dev пользователь успешно добавлен в БД:')
    console.log('   📧 Email:', devUser.email)
    console.log('   👤 Роль:', devUser.role)
    console.log('   🆔 ID:', devUser.user_id)
    console.log('')
    console.log('🚀 Теперь можно использовать /devlogin для входа!')

  } catch (error) {
    console.error('❌ Ошибка при добавлении dev пользователя:', error)
    process.exit(1)
  }
}

// Функция для обновления роли существующего dev пользователя
export async function updateDevUserRole() {
  try {
    console.log('🔄 Обновляем роль dev пользователя...')

    const { data, error } = await supabaseAdmin
      .from('profiles')
      .update({ role: 'Administrator' })
      .eq('email', 'dev@planetenglish.ru')
      .select()

    if (error) {
      throw error
    }

    if (data && data.length > 0) {
      console.log('✅ Роль dev пользователя обновлена до Administrator')
      console.log('   📧 Email:', data[0].email)
      console.log('   👤 Роль:', data[0].role)
    } else {
      console.log('⚠️ Dev пользователь не найден в БД')
    }

  } catch (error) {
    console.error('❌ Ошибка при обновлении роли dev пользователя:', error)
    process.exit(1)
  }
}

// Запускаем только в режиме разработки
if (process.env.NODE_ENV !== 'production') {
  // Сначала обновляем роль существующего пользователя
  updateDevUserRole()
    .then(() => {
      // Затем добавляем/проверяем пользователя
      addDevUser()
    })
    .catch(error => {
      console.error('❌ Ошибка при обновлении роли:', error)
      process.exit(1)
    })
} else {
  console.warn('⚠️  Скрипт не выполняется в продакшене')
}
