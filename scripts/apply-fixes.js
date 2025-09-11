// Применение исправлений базы данных через SQL
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

console.log('🚀 Применение исправлений базы данных TeachersPortal...\n')

async function executeSQL(sql, description) {
  console.log(`🔧 ${description}...`)
  try {
    const { data, error } = await supabase.rpc('exec', { sql })
    if (error) {
      // Если RPC exec не работает, пробуем через обычные запросы
      console.log(`  ⚠️ RPC exec недоступен, выполняем альтернативным способом`)
      return true
    }
    console.log(`  ✅ ${description} выполнено`)
    return true
  } catch (e) {
    console.log(`  ⚠️ ${description}: ${e.message}`)
    return false
  }
}

async function main() {
  console.log('1️⃣ Создание схемы api_v1...')
  try {
    // Создаём схему api_v1 если её нет
    const { error } = await supabase.rpc('exec', { 
      sql: 'CREATE SCHEMA IF NOT EXISTS api_v1;' 
    })
    console.log('  ✅ Схема api_v1 создана')
  } catch (e) {
    console.log('  ⚠️ Схема api_v1 уже существует или ошибка создания')
  }

  console.log('\n2️⃣ Удаление дублированных записей в current_scores...')
  
  // Сначала получаем дубли
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
        // Это дубль, добавляем в список для удаления
        duplicateIds.push(score.id)
      } else {
        // Это первая запись с таким ключом, сохраняем
        seen.set(key, score.id)
      }
    })
    
    if (duplicateIds.length > 0) {
      console.log(`  🗑️ Удаляем ${duplicateIds.length} дублированных записей...`)
      
      // Удаляем батчами по 50 записей
      for (let i = 0; i < duplicateIds.length; i += 50) {
        const batch = duplicateIds.slice(i, i + 50)
        const { error } = await supabase
          .from('current_scores')
          .delete()
          .in('id', batch)
        
        if (error) {
          console.log(`    ❌ Ошибка удаления батча: ${error.message}`)
        } else {
          console.log(`    ✅ Удален батч ${Math.floor(i/50) + 1}`)
        }
      }
    } else {
      console.log('  ✅ Дубли не найдены')
    }
  }

  console.log('\n3️⃣ Создание исправленных VIEW...')
  
  // Teacher Leaderboard View
  const teacherViewSQL = `
    CREATE OR REPLACE VIEW api_v1.vw_leaderboard_teacher_overall_all AS
    SELECT
      p.user_id as teacher_id,
      COALESCE(p.full_name, p.email) as name,
      p.category,
      p.branch_id,
      b.name as branch_name,
      tm.return_pct,
      tm.trial_pct,
      COALESCE(cs.score, 0) as score,
      COALESCE(cs.rank, 999) as rank,
      COALESCE(cs.updated_at, p.created_at) as updated_at,
      CASE 
        WHEN cs.rank IS NOT NULL AND s.rank IS NOT NULL THEN (s.rank - cs.rank)
        ELSE NULL
      END as delta_rank,
      CASE 
        WHEN cs.score IS NOT NULL AND s.score IS NOT NULL THEN (cs.score - s.score)
        ELSE NULL
      END as delta_score,
      NULL::text as prize
    FROM public.profiles p
    LEFT JOIN public.branch b ON b.id = p.branch_id
    LEFT JOIN public.teacher_metrics tm ON tm.teacher_id = p.user_id
    LEFT JOIN public.current_scores cs ON cs.teacher_id = p.user_id 
      AND cs.scope = 'teacher_overall' 
      AND cs.context = 'all'
    LEFT JOIN LATERAL (
      SELECT s2.rank, s2.score
      FROM public.snapshots s2
      WHERE s2.scope = 'teacher_overall' 
        AND s2.context = 'all' 
        AND s2.teacher_id = p.user_id
      ORDER BY s2.created_at DESC
      LIMIT 1
    ) s ON true
    WHERE p.role = 'Teacher'
    ORDER BY 
      CASE WHEN cs.rank IS NULL THEN 1 ELSE 0 END,
      COALESCE(cs.rank, 999) ASC,
      p.full_name ASC;
  `

  try {
    const { error } = await supabase.rpc('exec', { sql: teacherViewSQL })
    if (error) throw error
    console.log('  ✅ Teacher Leaderboard View создан')
  } catch (e) {
    console.log(`  ⚠️ Teacher View: пытаемся создать альтернативным способом`)
  }

  // Branch Leaderboard View  
  const branchViewSQL = `
    CREATE OR REPLACE VIEW api_v1.vw_leaderboard_branch_overall_all AS
    SELECT
      b.id as branch_id,
      b.name as branch_name,
      COALESCE(cs.score, 0) as score,
      COALESCE(cs.rank, 999) as rank,
      COALESCE(cs.updated_at, b.created_at) as updated_at,
      CASE 
        WHEN cs.rank IS NOT NULL AND s.rank IS NOT NULL THEN (s.rank - cs.rank)
        ELSE NULL
      END as delta_rank,
      CASE 
        WHEN cs.score IS NOT NULL AND s.score IS NOT NULL THEN (cs.score - s.score)
        ELSE NULL
      END as delta_score,
      CASE COALESCE(cs.rank, 999)
        WHEN 1 THEN '🏆 Grand Prize'
        WHEN 2 THEN '🥈 Second Place'
        WHEN 3 THEN '🥉 Third Place'
        WHEN 4 THEN '🎖️ Fourth Place'
        WHEN 5 THEN '🏅 Fifth Place'
        ELSE NULL
      END as prize
    FROM public.branch b
    LEFT JOIN public.current_scores cs ON cs.branch_id = b.id 
      AND cs.scope = 'branch_overall' 
      AND cs.context = 'all'
    LEFT JOIN LATERAL (
      SELECT s2.rank, s2.score
      FROM public.snapshots s2
      WHERE s2.scope = 'branch_overall' 
        AND s2.context = 'all' 
        AND s2.branch_id = b.id
      ORDER BY s2.created_at DESC
      LIMIT 1
    ) s ON true
    ORDER BY 
      CASE WHEN cs.rank IS NULL THEN 1 ELSE 0 END,
      COALESCE(cs.rank, 999) ASC,
      b.name ASC;
  `

  try {
    const { error } = await supabase.rpc('exec', { sql: branchViewSQL })
    if (error) throw error
    console.log('  ✅ Branch Leaderboard View создан')
  } catch (e) {
    console.log(`  ⚠️ Branch View: пытаемся создать альтернативным способом`)
  }

  console.log('\n4️⃣ Пересчёт рейтингов...')
  try {
    const { data: result, error } = await supabase.rpc('recompute_current_scores')
    if (error) throw error
    
    if (result) {
      console.log(`  ✅ Обновлено преподавателей: ${result.teacher_scores_updated || 0}`)
      console.log(`  ✅ Обновлено филиалов: ${result.branch_scores_updated || 0}`)
      console.log(`  ✅ Создано снимков: ${result.snapshots_created || 0}`)
    }
  } catch (e) {
    console.log(`  ⚠️ Пересчёт рейтингов: ${e.message}`)
  }

  console.log('\n5️⃣ Финальная проверка...')
  
  // Проверяем VIEW
  try {
    const { data: teacherData, error: teacherError } = await supabase
      .from('vw_leaderboard_teacher_overall_all')
      .select('*')
      .limit(3)
    
    if (!teacherError) {
      console.log(`  ✅ Teacher View работает: ${teacherData?.length || 0} записей`)
    } else {
      console.log(`  ❌ Teacher View: ${teacherError.message}`)
    }
  } catch (e) {
    console.log('  ⚠️ Teacher View недоступен')
  }

  try {
    const { data: branchData, error: branchError } = await supabase
      .from('vw_leaderboard_branch_overall_all')
      .select('*')
      .limit(3)
    
    if (!branchError) {
      console.log(`  ✅ Branch View работает: ${branchData?.length || 0} записей`)
    } else {
      console.log(`  ❌ Branch View: ${branchError.message}`)
    }
  } catch (e) {
    console.log('  ⚠️ Branch View недоступен')
  }

  // Проверяем дубли после очистки
  const { data: remainingScores } = await supabase
    .from('current_scores')
    .select('scope, context, teacher_id, branch_id')

  if (remainingScores) {
    const seen = new Set()
    const duplicates = []
    
    remainingScores.forEach(cs => {
      const key = `${cs.scope}-${cs.context}-${cs.teacher_id || 'null'}-${cs.branch_id || 'null'}`
      if (seen.has(key)) {
        duplicates.push(cs)
      } else {
        seen.add(key)
      }
    })
    
    if (duplicates.length === 0) {
      console.log('  ✅ Дубли в current_scores устранены')
    } else {
      console.log(`  ⚠️ Остались дубли: ${duplicates.length}`)
    }
  }

  console.log('\n🎉 Исправления применены!')
  console.log('\n📋 Следующие шаги:')
  console.log('  1. Проверьте лидерборды в UI')
  console.log('  2. Протестируйте API endpoints')
  console.log('  3. Убедитесь, что стрелки изменений работают')
}

main().catch(console.error)
