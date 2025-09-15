import { NextResponse } from "next/server"
import { PyrusUsersClient } from "@/lib/pyrus/client"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { getOptimalAvatarUrl } from "@/lib/utils/avatar"
import { LeaderboardSyncService } from "@/lib/services/leaderboard-sync.service"

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
      console.log('🎯 Запуск автоматической синхронизации лидербордов через LeaderboardSyncService...')
      
      const syncService = new LeaderboardSyncService()
      const result = await syncService.syncTeacherData()
      
      if (result.success) {
        leaderboardSyncResult = {
          success: true,
          phantom_users_removed: result.phantomUsersRemoved,
          missing_teachers_added: result.missingTeachersAdded,
          teachers_processed: result.teachersInProfiles
        }
        console.log('✅ Автоматическая синхронизация лидербордов завершена через унифицированный сервис')
        console.log(`📊 Удалено фантомов: ${result.phantomUsersRemoved}, добавлено преподавателей: ${result.missingTeachersAdded}`)
      } else {
        throw new Error(result.error || 'LeaderboardSyncService returned unsuccessful result')
      }
      
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
