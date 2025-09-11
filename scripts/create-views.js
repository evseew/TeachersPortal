// Создание VIEW через прямые SQL запросы
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

// Читаем credentials
const envContent = readFileSync('.env.local', 'utf-8')
const envLines = envContent.split('\n')
const env = {}

envLines.forEach(line => {
  const [key, value] = line.split('=')
  if (key && value) {
    env[key.trim()] = value.trim()
  }
})

const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE, {
  auth: { persistSession: false }
})

console.log('🔧 Создание VIEW для лидербордов...\n')

async function createTeacherView() {
  console.log('1️⃣ Создание Teacher Leaderboard View...')
  
  // Сначала удаляем существующий view если есть
  try {
    await supabase.rpc('exec', { 
      sql: 'DROP VIEW IF EXISTS api_v1.vw_leaderboard_teacher_overall_all CASCADE;' 
    })
  } catch (e) {
    // Игнорируем ошибки удаления
  }

  // Создаём новый view по частям
  const createViewSQL = `
    CREATE VIEW api_v1.vw_leaderboard_teacher_overall_all AS
    SELECT
      p.user_id as teacher_id,
      COALESCE(p.full_name, p.email) as name,
      p.category::text,
      p.branch_id,
      b.name as branch_name,
      tm.return_pct,
      tm.trial_pct,
      COALESCE(cs.score, 0) as score,
      COALESCE(cs.rank, 999) as rank,
      COALESCE(cs.updated_at, p.created_at) as updated_at,
      NULL::integer as delta_rank,
      NULL::numeric as delta_score,
      NULL::text as prize
    FROM public.profiles p
    LEFT JOIN public.branch b ON b.id = p.branch_id
    LEFT JOIN public.teacher_metrics tm ON tm.teacher_id = p.user_id
    LEFT JOIN public.current_scores cs ON cs.teacher_id = p.user_id 
      AND cs.scope = 'teacher_overall' 
      AND cs.context = 'all'
    WHERE p.role = 'Teacher'
    ORDER BY 
      CASE WHEN cs.rank IS NULL THEN 1 ELSE 0 END,
      COALESCE(cs.rank, 999) ASC,
      p.full_name ASC;
  `

  try {
    const { error } = await supabase.rpc('exec', { sql: createViewSQL })
    if (error) {
      console.log(`  ❌ Ошибка создания: ${error.message}`)
      return false
    }
    console.log('  ✅ Teacher View создан успешно')
    return true
  } catch (e) {
    console.log(`  ❌ Исключение: ${e.message}`)
    return false
  }
}

async function createBranchView() {
  console.log('\n2️⃣ Создание Branch Leaderboard View...')
  
  // Удаляем существующий view
  try {
    await supabase.rpc('exec', { 
      sql: 'DROP VIEW IF EXISTS api_v1.vw_leaderboard_branch_overall_all CASCADE;' 
    })
  } catch (e) {
    // Игнорируем ошибки
  }

  const createViewSQL = `
    CREATE VIEW api_v1.vw_leaderboard_branch_overall_all AS
    SELECT
      b.id as branch_id,
      b.name as branch_name,
      COALESCE(cs.score, 0) as score,
      COALESCE(cs.rank, 999) as rank,
      COALESCE(cs.updated_at, now()) as updated_at,
      NULL::integer as delta_rank,
      NULL::numeric as delta_score,
      CASE COALESCE(cs.rank, 999)
        WHEN 1 THEN 'Grand Prize'
        WHEN 2 THEN 'Second Place'
        WHEN 3 THEN 'Third Place'
        WHEN 4 THEN 'Fourth Place'
        WHEN 5 THEN 'Fifth Place'
        ELSE NULL
      END as prize
    FROM public.branch b
    LEFT JOIN public.current_scores cs ON cs.branch_id = b.id 
      AND cs.scope = 'branch_overall' 
      AND cs.context = 'all'
    ORDER BY 
      CASE WHEN cs.rank IS NULL THEN 1 ELSE 0 END,
      COALESCE(cs.rank, 999) ASC,
      b.name ASC;
  `

  try {
    const { error } = await supabase.rpc('exec', { sql: createViewSQL })
    if (error) {
      console.log(`  ❌ Ошибка создания: ${error.message}`)
      return false
    }
    console.log('  ✅ Branch View создан успешно')
    return true
  } catch (e) {
    console.log(`  ❌ Исключение: ${e.message}`)
    return false
  }
}

async function testViews() {
  console.log('\n3️⃣ Тестирование VIEW...')
  
  // Тест Teacher View
  try {
    const { data, error } = await supabase
      .from('vw_leaderboard_teacher_overall_all')
      .select('teacher_id, name, score, rank')
      .limit(3)
    
    if (!error && data) {
      console.log('  ✅ Teacher View работает:')
      data.forEach(teacher => {
        console.log(`    - ${teacher.name}: ${teacher.score} баллов (ранг ${teacher.rank})`)
      })
    } else {
      console.log(`  ❌ Teacher View ошибка: ${error?.message}`)
    }
  } catch (e) {
    console.log(`  ❌ Teacher View исключение: ${e.message}`)
  }

  // Тест Branch View
  try {
    const { data, error } = await supabase
      .from('vw_leaderboard_branch_overall_all')
      .select('branch_name, score, rank, prize')
      .limit(3)
    
    if (!error && data) {
      console.log('  ✅ Branch View работает:')
      data.forEach(branch => {
        console.log(`    - ${branch.branch_name}: ${branch.score} баллов (ранг ${branch.rank}) ${branch.prize || ''}`)
      })
    } else {
      console.log(`  ❌ Branch View ошибка: ${error?.message}`)
    }
  } catch (e) {
    console.log(`  ❌ Branch View исключение: ${e.message}`)
  }
}

async function cleanupDuplicates() {
  console.log('\n4️⃣ Финальная очистка дублей...')
  
  const { data: allScores } = await supabase
    .from('current_scores')
    .select('id, scope, context, teacher_id, branch_id, updated_at')
    .order('updated_at', { ascending: false })

  if (allScores) {
    const seen = new Map()
    const duplicateIds = []
    
    allScores.forEach(score => {
      const key = `${score.scope}-${score.context}-${score.teacher_id || 'null'}-${score.branch_id || 'null'}`
      
      if (seen.has(key)) {
        duplicateIds.push(score.id)
      } else {
        seen.set(key, score.id)
      }
    })
    
    if (duplicateIds.length > 0) {
      console.log(`  🗑️ Удаляем оставшиеся ${duplicateIds.length} дублей...`)
      
      const { error } = await supabase
        .from('current_scores')
        .delete()
        .in('id', duplicateIds)
      
      if (!error) {
        console.log('  ✅ Все дубли удалены')
      } else {
        console.log(`  ❌ Ошибка удаления: ${error.message}`)
      }
    } else {
      console.log('  ✅ Дублей не осталось')
    }
  }
}

async function main() {
  const teacherSuccess = await createTeacherView()
  const branchSuccess = await createBranchView()
  
  if (teacherSuccess && branchSuccess) {
    await testViews()
    await cleanupDuplicates()
    
    console.log('\n🎉 VIEW созданы и протестированы!')
    console.log('\n📋 Теперь можно:')
    console.log('  1. Проверить лидерборды: /september-rating')
    console.log('  2. Протестировать API: /api/leaderboard?type=teacher_overall')
    console.log('  3. Проверить UI компоненты')
  } else {
    console.log('\n❌ Не удалось создать все VIEW')
    console.log('Возможно, нужно использовать Supabase Dashboard для создания VIEW вручную')
  }
}

main().catch(console.error)
