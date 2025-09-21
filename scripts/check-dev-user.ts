#!/usr/bin/env tsx

import dotenv from 'dotenv'
// Загружаем переменные окружения
dotenv.config({ path: '.env.local' })

import { supabaseAdmin } from "@/lib/supabase/admin"

async function checkDevUser() {
  console.log("🔍 Проверяем пользователя dev@planetenglish.ru в базе данных...\n")

  try {
    // Проверяем в таблице profiles
    console.log("1️⃣ Проверяем таблицу profiles:")
    const { data: profileData, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('email', 'dev@planetenglish.ru')
      .single()

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

    console.log("\n2️⃣ Проверяем все записи с похожим email:")
    const { data: allProfiles, error: allError } = await supabaseAdmin
      .from('profiles')
      .select('email, role, full_name')
      .ilike('email', '%dev%')

    if (allError) {
      console.log(`❌ Ошибка при запросе всех профилей: ${allError.message}`)
    } else {
      console.log(`📋 Найдено ${allProfiles?.length || 0} профилей с 'dev' в email:`)
      allProfiles?.forEach((profile, index) => {
        console.log(`   ${index + 1}. ${profile.email} - ${profile.role} (${profile.full_name})`)
      })
    }

    console.log("\n3️⃣ Проверяем общее количество пользователей:")
    const { count, error: countError } = await supabaseAdmin
      .from('profiles')
      .select('*', { count: 'exact', head: true })

    if (countError) {
      console.log(`❌ Ошибка при подсчете: ${countError.message}`)
    } else {
      console.log(`📊 Всего пользователей в базе: ${count}`)
    }

    console.log("\n4️⃣ Проверяем административных пользователей:")
    const { data: adminUsers, error: adminError } = await supabaseAdmin
      .from('profiles')
      .select('email, full_name, role')
      .eq('role', 'Administrator')

    if (adminError) {
      console.log(`❌ Ошибка при поиске админов: ${adminError.message}`)
    } else {
      console.log(`👑 Найдено ${adminUsers?.length || 0} администраторов:`)
      adminUsers?.forEach((admin, index) => {
        console.log(`   ${index + 1}. ${admin.email} - ${admin.full_name}`)
      })
    }

  } catch (error) {
    console.error("💥 Общая ошибка:", error)
  }
}

// Запускаем проверку
checkDevUser()
  .then(() => {
    console.log("\n✅ Проверка завершена")
    process.exit(0)
  })
  .catch((error) => {
    console.error("💥 Ошибка выполнения:", error)
    process.exit(1)
  })
