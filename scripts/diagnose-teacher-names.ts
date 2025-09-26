/**
 * Утилита для диагностики сопоставления имен преподавателей
 * между Pyrus и базой данных портала
 * 
 * Запуск: SUPABASE_URL=xxx SUPABASE_SERVICE_ROLE_KEY=xxx npx tsx scripts/diagnose-teacher-names.ts
 */

import { createClient } from '@supabase/supabase-js'

// Используем переменные окружения напрямую
const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Требуются переменные окружения SUPABASE_URL и SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabaseAdmin = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function diagnoseTeacherNames() {
  try {
    console.log('🔍 Диагностика имен преподавателей...\n')

    // Получаем всех преподавателей из базы данных
    const { data: profiles, error: profilesError } = await supabaseAdmin
      .from('profiles')
      .select('user_id, full_name, email, created_at')
      .eq('role', 'Teacher')
      .order('full_name')

    if (profilesError) {
      throw new Error(`Ошибка получения профилей: ${profilesError.message}`)
    }

    console.log(`📊 Найдено ${profiles?.length || 0} преподавателей в базе данных:\n`)
    
    profiles?.forEach((profile, index) => {
      console.log(`${(index + 1).toString().padStart(2, '0')}. "${profile.full_name}" (${profile.email})`)
    })

    console.log('\n' + '='.repeat(60))

    // Получаем данные из teacher_metrics (кто уже синхронизирован)
    const { data: metrics, error: metricsError } = await supabaseAdmin
      .from('teacher_metrics')
      .select(`
        teacher_id,
        last_year_base,
        last_year_returned,
        trial_total,
        trial_converted,
        updated_at,
        updated_by
      `)
      .not('last_year_base', 'is', null)
      .or('last_year_returned.gt.0,trial_converted.gt.0')

    if (metricsError) {
      throw new Error(`Ошибка получения метрик: ${metricsError.message}`)
    }

    console.log(`\n📈 Преподаватели с данными из синхронизации (${metrics?.length || 0}):\n`)

    if (metrics && metrics.length > 0) {
      // Получаем имена для этих ID
      const teacherIds = metrics.map(m => m.teacher_id)
      const { data: syncedProfiles } = await supabaseAdmin
        .from('profiles')
        .select('user_id, full_name')
        .in('user_id', teacherIds)

      const profileMap = new Map(syncedProfiles?.map(p => [p.user_id, p.full_name]) || [])

      metrics.forEach((metric, index) => {
        const name = profileMap.get(metric.teacher_id) || 'Неизвестно'
        console.log(`${(index + 1).toString().padStart(2, '0')}. "${name}"`)
        console.log(`    Старички: ${metric.last_year_returned}/${metric.last_year_base} (${Math.round((metric.last_year_returned / metric.last_year_base) * 100)}%)`)
        console.log(`    Trial: ${metric.trial_converted}/${metric.trial_total}`)
        console.log(`    Обновлено: ${metric.updated_at} (${metric.updated_by})`)
        console.log('')
      })
    } else {
      console.log('❌ Нет данных синхронизации')
    }

    console.log('\n' + '='.repeat(60))
    console.log('\n✅ Диагностика завершена')

  } catch (error) {
    console.error('❌ Ошибка диагностики:', error)
  }
}

// Запускаем диагностику
diagnoseTeacherNames().then(() => {
  process.exit(0)
}).catch((error) => {
  console.error('Критическая ошибка:', error)
  process.exit(1)
})
