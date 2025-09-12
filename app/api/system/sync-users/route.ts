import { NextResponse } from "next/server"
import { PyrusUsersClient } from "@/lib/pyrus/client"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { getOptimalAvatarUrl } from "@/lib/utils/avatar"

/**
 * Синхронизация пользователей из Pyrus
 * 
 * POST /api/system/sync-users
 * 
 * Стратегия:
 * - Все новые пользователи получают роль "Regular User"
 * - Администратор потом вручную назначает правильные роли
 * - Сохраняются локальные настройки (роли, категории, филиалы)
 */
export async function POST() {
  try {
    console.log('🔄 Начинаем синхронизацию пользователей из Pyrus...')
    
    // 1. Получаем пользователей из Pyrus
    const pyrusClient = new PyrusUsersClient()
    const pyrusUsers = await pyrusClient.getActiveMembers()
    
    if (pyrusUsers.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Не удалось получить пользователей из Pyrus'
      }, { status: 500 })
    }
    
    console.log(`📊 Получено ${pyrusUsers.length} активных пользователей из Pyrus`)
    
    // 2. Получаем текущих пользователей из портала
    const { data: currentUsers, error: fetchError } = await supabaseAdmin
      .from('profiles')
      .select('user_id, email, full_name, role, category, branch_id')
    
    if (fetchError) {
      throw fetchError
    }
    
    console.log(`📊 Текущих пользователей на портале: ${currentUsers?.length || 0}`)
    
    const syncResults = {
      added: 0,
      updated: 0,
      unchanged: 0,
      errors: [] as string[]
    }
    
    // 3. Синхронизация пользователей
    for (const pyrusUser of pyrusUsers) {
      try {
        const email = pyrusUser.email.toLowerCase()
        const fullName = `${pyrusUser.first_name || ''} ${pyrusUser.last_name || ''}`.trim() || email
        
        // Ищем существующего пользователя
        const existingUser = currentUsers?.find(u => u.email.toLowerCase() === email)
        
        if (!existingUser) {
          // Генерируем URL аватара
          const avatarUrl = getOptimalAvatarUrl(email, fullName, { 
            size: 64, 
            defaultType: 'generated' 
          })
          
          // Добавляем нового пользователя с ролью "Regular User"
          const { error: insertError } = await supabaseAdmin
            .from('profiles')
            .insert({
              email: email,
              full_name: fullName,
              role: 'Salesman', // Временно используем Salesman вместо Regular User
              category: null,
              branch_id: null,
              avatar_url: avatarUrl
            })
          
          if (insertError) {
            throw insertError
          }
          
          syncResults.added++
          console.log(`➕ Добавлен: ${fullName} (${email})`)
          
        } else {
          // Обновляем только имя, роль и локальные настройки НЕ ТРОГАЕМ
          const nameChanged = existingUser.full_name !== fullName
          
          if (nameChanged) {
            const { error: updateError } = await supabaseAdmin
              .from('profiles')
              .update({ full_name: fullName })
              .eq('user_id', existingUser.user_id)
            
            if (updateError) {
              throw updateError
            }
            
            syncResults.updated++
            console.log(`🔄 Обновлен: ${fullName} (${email}) - изменено имя`)
          } else {
            syncResults.unchanged++
          }
        }
        
      } catch (error: any) {
        const errorMsg = `Ошибка обработки ${pyrusUser.email}: ${error.message}`
        syncResults.errors.push(errorMsg)
        console.error(`❌ ${errorMsg}`)
      }
    }
    
    // 4. НЕ УДАЛЯЕМ пользователей - только добавляем и обновляем
    // Удаление будет реализовано в отдельной задаче при необходимости
    
    console.log('✅ Синхронизация пользователей завершена')
    console.log(`📊 Результаты: добавлено ${syncResults.added}, обновлено ${syncResults.updated}, без изменений ${syncResults.unchanged}`)
    
    // 5. Автоматическая синхронизация лидербордов для предотвращения рассинхрона
    let leaderboardSyncResult = null
    try {
      console.log('🎯 Запуск автоматической синхронизации лидербордов...')
      
      const { data: leaderboardData, error: leaderboardError } = await supabaseAdmin
        .from('profiles')
        .select('user_id, full_name, email, role, category, branch_id')
        .eq('role', 'Teacher')
        .order('full_name')

      if (leaderboardError) throw leaderboardError

      // Получаем текущие данные из current_scores для преподавателей
      const { data: currentScores, error: scoresError } = await supabaseAdmin
        .from('current_scores')
        .select('teacher_id, score, rank')
        .eq('scope', 'teacher_overall')
        .eq('context', 'all')
        .not('teacher_id', 'is', null)

      if (scoresError) throw scoresError

      // Найдём фантомных пользователей и отсутствующих преподавателей
      const teacherIds = new Set(leaderboardData?.map(t => t.user_id) || [])
      const phantomScores = currentScores?.filter(cs => !teacherIds.has(cs.teacher_id)) || []
      const existingTeacherIds = new Set(currentScores?.map(cs => cs.teacher_id) || [])
      const missingTeachers = leaderboardData?.filter(t => !existingTeacherIds.has(t.user_id)) || []

      // Удаляем фантомных пользователей
      if (phantomScores.length > 0) {
        const phantomIds = phantomScores.map(ps => ps.teacher_id)
        const { error: deleteError } = await supabaseAdmin
          .from('current_scores')
          .delete()
          .eq('scope', 'teacher_overall')
          .eq('context', 'all')
          .in('teacher_id', phantomIds)
        if (deleteError) throw deleteError
      }

      // Добавляем отсутствующих преподавателей
      if (missingTeachers.length > 0) {
        for (const teacher of missingTeachers) {
          const { error: metricsError } = await supabaseAdmin
            .from('teacher_metrics')
            .upsert({
              teacher_id: teacher.user_id,
              branch_id: teacher.branch_id,
              last_year_base: 0,
              last_year_returned: 0,
              trial_total: 0,
              trial_converted: 0,
              updated_by: 'auto-sync'
            }, { onConflict: 'teacher_id' })
          if (metricsError) console.error(`Ошибка upsert метрик для ${teacher.full_name}:`, metricsError)
        }

        // Пересчитываем рейтинги
        const { error: recomputeError } = await supabaseAdmin.rpc('recompute_current_scores')
        if (recomputeError) throw recomputeError
      }

      // Синхронизируем branch_id для ВСЕХ существующих преподавателей 
      // (важно для предотвращения рассинхрона profiles.branch_id и teacher_metrics.branch_id)
      if (leaderboardData && leaderboardData.length > 0) {
        for (const teacher of leaderboardData) {
          const { error: updateBranchError } = await supabaseAdmin
            .from('teacher_metrics')
            .update({ 
              branch_id: teacher.branch_id,
              updated_by: 'auto-sync-branch'
            })
            .eq('teacher_id', teacher.user_id)
          
          if (updateBranchError) {
            console.error(`Ошибка обновления branch_id для ${teacher.full_name}:`, updateBranchError)
          }
        }
        
        // Повторный пересчёт рейтингов после синхронизации branch_id
        const { error: finalRecomputeError } = await supabaseAdmin.rpc('recompute_current_scores')
        if (finalRecomputeError) throw finalRecomputeError
        
        console.log('🔄 Синхронизированы branch_id для всех преподавателей')
      }

      leaderboardSyncResult = {
        success: true,
        phantom_users_removed: phantomScores.length,
        missing_teachers_added: missingTeachers.length,
        teachers_processed: leaderboardData?.length || 0
      }
      
      console.log('✅ Автоматическая синхронизация лидербордов завершена')
      console.log(`📊 Удалено фантомов: ${phantomScores.length}, добавлено преподавателей: ${missingTeachers.length}`)
      
    } catch (leaderboardError: any) {
      console.error('⚠️ Ошибка синхронизации лидербордов:', leaderboardError)
      leaderboardSyncResult = {
        success: false,
        error: leaderboardError.message || 'Неизвестная ошибка синхронизации лидербордов'
      }
    }
    
    return NextResponse.json({
      success: true,
      message: 'Синхронизация завершена успешно',
      results: {
        totalPyrusUsers: pyrusUsers.length,
        added: syncResults.added,
        updated: syncResults.updated,
        unchanged: syncResults.unchanged,
        errors: syncResults.errors
      },
      leaderboard_sync: leaderboardSyncResult,
      timestamp: new Date().toISOString()
    })
    
  } catch (error: any) {
    console.error('❌ Ошибка синхронизации:', error)
    return NextResponse.json({
      success: false,
      error: error.message || 'Неизвестная ошибка синхронизации',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}
