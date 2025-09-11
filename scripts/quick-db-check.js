// Быстрая диагностика базы данных Supabase
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

// Читаем credentials из .env.local
const envContent = readFileSync('.env.local', 'utf-8')
const envLines = envContent.split('\n')
const env = {}

envLines.forEach(line => {
  const [key, value] = line.split('=')
  if (key && value) {
    env[key.trim()] = value.trim()
  }
})

const supabaseUrl = env.SUPABASE_URL
const supabaseServiceRole = env.SUPABASE_SERVICE_ROLE

if (!supabaseUrl || !supabaseServiceRole) {
  console.error('❌ Не найдены SUPABASE_URL или SUPABASE_SERVICE_ROLE в .env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceRole, {
  auth: { persistSession: false }
})

console.log('🔍 Запуск диагностики базы данных TeachersPortal...\n')

async function main() {
  try {
    // 1. Тест подключения
    console.log('1️⃣ Проверка подключения...')
    const { data, error } = await supabase.from('profiles').select('user_id').limit(1)
    if (error) {
      console.error('❌ Ошибка подключения:', error.message)
      return
    }
    console.log('✅ Подключение успешно\n')

    // 2. Статистика таблиц
    console.log('2️⃣ Статистика таблиц:')
    const tables = ['profiles', 'branch', 'teacher_metrics', 'current_scores', 'snapshots']
    
    for (const table of tables) {
      try {
        const { count, error } = await supabase
          .from(table)
          .select('*', { count: 'exact', head: true })
        
        if (!error) {
          console.log(`  ✅ ${table}: ${count || 0} записей`)
        } else {
          console.log(`  ❌ ${table}: ошибка - ${error.message}`)
        }
      } catch (e) {
        console.log(`  ❌ ${table}: таблица недоступна`)
      }
    }

    // 3. Проверка orphaned записей в current_scores
    console.log('\n3️⃣ Проверка orphaned записей в current_scores:')
    
    // Orphaned teacher_id
    const { data: orphanedTeachers, error: orphanError } = await supabase
      .from('current_scores')
      .select('teacher_id')
      .not('teacher_id', 'is', null)

    if (!orphanError && orphanedTeachers) {
      // Проверяем, сколько из них действительно orphaned
      const { data: validTeachers } = await supabase
        .from('profiles')
        .select('user_id')
      
      const validTeacherIds = new Set((validTeachers || []).map(t => t.user_id))
      const orphaned = orphanedTeachers.filter(cs => !validTeacherIds.has(cs.teacher_id))
      
      if (orphaned.length > 0) {
        console.log(`  ⚠️ Найдено ${orphaned.length} orphaned teacher_id в current_scores`)
      } else {
        console.log('  ✅ Orphaned teacher_id не найдены')
      }
    }

    // 4. Проверка дублей в current_scores
    console.log('\n4️⃣ Проверка дублей в current_scores:')
    const { data: allCurrentScores } = await supabase
      .from('current_scores')
      .select('scope, context, teacher_id, branch_id')

    if (allCurrentScores) {
      const seen = new Set()
      const duplicates = []
      
      allCurrentScores.forEach(cs => {
        const key = `${cs.scope}-${cs.context}-${cs.teacher_id || 'null'}-${cs.branch_id || 'null'}`
        if (seen.has(key)) {
          duplicates.push(cs)
        } else {
          seen.add(key)
        }
      })
      
      if (duplicates.length > 0) {
        console.log(`  ⚠️ Найдено ${duplicates.length} дублированных записей`)
      } else {
        console.log('  ✅ Дубли не найдены')
      }
    }

    // 5. Проверка VIEW
    console.log('\n5️⃣ Проверка VIEW:')
    
    // Teacher leaderboard view
    try {
      const { data: teacherView, error: teacherError } = await supabase
        .from('api_v1.vw_leaderboard_teacher_overall_all')
        .select('*')
        .limit(5)
      
      if (!teacherError) {
        console.log(`  ✅ Teacher Leaderboard View: ${teacherView?.length || 0} записей доступно`)
      } else {
        console.log(`  ❌ Teacher Leaderboard View: ${teacherError.message}`)
      }
    } catch (e) {
      console.log('  ❌ Teacher Leaderboard View: недоступен')
    }

    // Branch leaderboard view
    try {
      const { data: branchView, error: branchError } = await supabase
        .from('api_v1.vw_leaderboard_branch_overall_all')
        .select('*')
        .limit(5)
      
      if (!branchError) {
        console.log(`  ✅ Branch Leaderboard View: ${branchView?.length || 0} записей доступно`)
      } else {
        console.log(`  ❌ Branch Leaderboard View: ${branchError.message}`)
      }
    } catch (e) {
      console.log('  ❌ Branch Leaderboard View: недоступен')
    }

    // 6. Проверка RPC функций
    console.log('\n6️⃣ Проверка RPC функций:')
    
    const rpcFunctions = [
      'ensure_profile',
      'metrics_batch_upsert', 
      'recompute_current_scores'
    ]
    
    for (const func of rpcFunctions) {
      try {
        const { error } = await supabase.rpc(func, {})
        
        if (error && error.message.includes('function') && error.message.includes('does not exist')) {
          console.log(`  ❌ ${func}: функция не существует`)
        } else {
          console.log(`  ✅ ${func}: функция доступна`)
        }
      } catch (e) {
        console.log(`  ⚠️ ${func}: ${e.message}`)
      }
    }

    console.log('\n🎯 Диагностика завершена!')
    console.log('\n📋 Рекомендации:')
    
    // Создаём рекомендации на основе найденных проблем
    const recommendations = []
    
    if (orphaned.length > 0) {
      recommendations.push('- Удалить orphaned записи из current_scores')
    }
    
    if (duplicates.length > 0) {
      recommendations.push('- Устранить дублирование в current_scores')
    }
    
    if (recommendations.length === 0) {
      console.log('✅ Критических проблем не обнаружено!')
    } else {
      recommendations.forEach(rec => console.log(rec))
      console.log('\n🔧 Для исправления запустите: npm run db:fix')
    }

  } catch (error) {
    console.error('💥 Критическая ошибка:', error)
  }
}

main().catch(console.error)
