#!/usr/bin/env npx tsx

/**
 * Скрипт для диагностики целостности базы данных TeachersPortal
 * Проверяет orphaned записи, дублирование, состояние constraints
 */

import { createClient } from '@supabase/supabase-js'

// Credentials нужно будет передать через переменные окружения
const supabaseUrl = process.env.SUPABASE_URL
const supabaseServiceRole = process.env.SUPABASE_SERVICE_ROLE

if (!supabaseUrl || !supabaseServiceRole) {
  console.error('❌ Необходимо установить SUPABASE_URL и SUPABASE_SERVICE_ROLE')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceRole, {
  auth: { persistSession: false }
})

interface IntegrityReport {
  table: string
  issue: string
  count: number
  details?: any[]
}

async function checkTableExists(tableName: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('information_schema.tables')
    .select('table_name')
    .eq('table_schema', 'public')
    .eq('table_name', tableName)
  
  return !error && data && data.length > 0
}

async function checkOrphanedCurrentScores(): Promise<IntegrityReport[]> {
  const issues: IntegrityReport[] = []

  // Orphaned teacher_id в current_scores (нет в profiles)
  const { data: orphanedTeachers, error: teacherError } = await supabase.rpc('check_orphaned_current_scores_teachers')
  if (!teacherError && orphanedTeachers) {
    issues.push({
      table: 'current_scores',
      issue: 'Orphaned teacher_id (не существует в profiles)',
      count: Array.isArray(orphanedTeachers) ? orphanedTeachers.length : orphanedTeachers,
      details: Array.isArray(orphanedTeachers) ? orphanedTeachers : []
    })
  }

  // Orphaned branch_id в current_scores (нет в branch)
  const { data: orphanedBranches, error: branchError } = await supabase.rpc('check_orphaned_current_scores_branches')
  if (!branchError && orphanedBranches) {
    issues.push({
      table: 'current_scores',
      issue: 'Orphaned branch_id (не существует в branch)',
      count: Array.isArray(orphanedBranches) ? orphanedBranches.length : orphanedBranches,
      details: Array.isArray(orphanedBranches) ? orphanedBranches : []
    })
  }

  return issues
}

async function checkOrphanedTeacherMetrics(): Promise<IntegrityReport[]> {
  const issues: IntegrityReport[] = []

  // Orphaned teacher_id в teacher_metrics (нет в profiles)
  const { data, error } = await supabase
    .from('teacher_metrics')
    .select(`
      teacher_id,
      profiles!inner(user_id)
    `)
  
  if (!error) {
    const orphaned = data?.filter(tm => !tm.profiles) || []
    if (orphaned.length > 0) {
      issues.push({
        table: 'teacher_metrics',
        issue: 'Orphaned teacher_id (не существует в profiles)',
        count: orphaned.length,
        details: orphaned.map(o => o.teacher_id)
      })
    }
  }

  return issues
}

async function checkDuplicateCurrentScores(): Promise<IntegrityReport[]> {
  const issues: IntegrityReport[] = []

  // Дубли в current_scores по scope/context/teacher_id
  const { data, error } = await supabase.rpc('check_duplicate_current_scores')
  if (!error && data) {
    issues.push({
      table: 'current_scores',
      issue: 'Дублирование записей по scope/context/teacher_id',
      count: Array.isArray(data) ? data.length : data,
      details: Array.isArray(data) ? data : []
    })
  }

  return issues
}

async function checkMissingTeachersInCurrentScores(): Promise<IntegrityReport[]> {
  const issues: IntegrityReport[] = []

  // Учителя из profiles, которых нет в current_scores
  const { data, error } = await supabase
    .from('profiles')
    .select('user_id, full_name, email')
    .eq('role', 'Teacher')

  if (!error && data) {
    const { data: currentScores } = await supabase
      .from('current_scores')
      .select('teacher_id')
      .eq('scope', 'teacher_overall')
      .eq('context', 'all')

    const existingTeacherIds = new Set(currentScores?.map(cs => cs.teacher_id) || [])
    const missingTeachers = data.filter(t => !existingTeacherIds.has(t.user_id))

    if (missingTeachers.length > 0) {
      issues.push({
        table: 'current_scores',
        issue: 'Учителя из profiles отсутствуют в current_scores',
        count: missingTeachers.length,
        details: missingTeachers
      })
    }
  }

  return issues
}

async function checkTableCounts(): Promise<void> {
  console.log('\n📊 Количество записей в таблицах:')
  
  const tables = ['profiles', 'branch', 'teacher_metrics', 'current_scores', 'snapshots']
  
  for (const table of tables) {
    const { count, error } = await supabase
      .from(table)
      .select('*', { count: 'exact', head: true })
    
    if (!error) {
      console.log(`  ${table}: ${count || 0} записей`)
    } else {
      console.log(`  ${table}: ❌ ошибка - ${error.message}`)
    }
  }
}

async function checkViewsAndFunctions(): Promise<void> {
  console.log('\n🔍 Проверка VIEW и функций:')
  
  // Проверяем основные VIEW
  const views = [
    'api_v1.vw_leaderboard_teacher_overall_all',
    'api_v1.vw_leaderboard_branch_overall_all'
  ]
  
  for (const view of views) {
    try {
      const { data, error } = await supabase
        .from(view)
        .select('*', { count: 'exact', head: true })
      
      if (!error) {
        console.log(`  ✅ ${view}: ${data?.length || 0} записей`)
      } else {
        console.log(`  ❌ ${view}: ${error.message}`)
      }
    } catch (e) {
      console.log(`  ❌ ${view}: не доступен`)
    }
  }
  
  // Проверяем RPC функции
  const functions = ['ensure_profile', 'metrics_batch_upsert', 'recompute_current_scores']
  
  for (const func of functions) {
    try {
      // Попробуем вызвать с пустыми параметрами для проверки существования
      const { error } = await supabase.rpc(func, {})
      
      if (error && error.message.includes('function') && error.message.includes('does not exist')) {
        console.log(`  ❌ ${func}: функция не существует`)
      } else {
        console.log(`  ✅ ${func}: функция доступна`)
      }
    } catch (e) {
      console.log(`  ⚠️ ${func}: ${e}`)
    }
  }
}

async function main() {
  console.log('🔍 Начинаем диагностику целостности базы данных...\n')

  try {
    // Базовая проверка подключения
    const { data, error } = await supabase.from('profiles').select('user_id').limit(1)
    if (error) {
      console.error('❌ Ошибка подключения к базе данных:', error.message)
      return
    }
    console.log('✅ Подключение к базе данных успешно')

    await checkTableCounts()
    await checkViewsAndFunctions()

    // Собираем все проблемы целостности
    const allIssues: IntegrityReport[] = []
    
    console.log('\n🔍 Проверка целостности данных...')
    
    const orphanedCurrentScores = await checkOrphanedCurrentScores()
    const orphanedTeacherMetrics = await checkOrphanedTeacherMetrics()
    const duplicateCurrentScores = await checkDuplicateCurrentScores()
    const missingTeachers = await checkMissingTeachersInCurrentScores()
    
    allIssues.push(...orphanedCurrentScores, ...orphanedTeacherMetrics, ...duplicateCurrentScores, ...missingTeachers)

    // Выводим отчет
    console.log('\n📋 Отчет о проблемах целостности:')
    if (allIssues.length === 0) {
      console.log('✅ Проблем не найдено!')
    } else {
      allIssues.forEach((issue, index) => {
        console.log(`\n${index + 1}. ${issue.table}`)
        console.log(`   Проблема: ${issue.issue}`)
        console.log(`   Количество: ${issue.count}`)
        if (issue.details && issue.details.length > 0 && issue.details.length <= 10) {
          console.log(`   Детали:`, issue.details)
        } else if (issue.count > 10) {
          console.log(`   (слишком много записей для вывода)`)
        }
      })

      console.log(`\n❌ Всего найдено ${allIssues.length} типов проблем`)
    }

  } catch (error) {
    console.error('❌ Критическая ошибка:', error)
  }
}

main().catch(console.error)
