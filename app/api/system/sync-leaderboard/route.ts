import { NextRequest, NextResponse } from "next/server"
import { LeaderboardSyncService } from "@/lib/services/leaderboard-sync.service"
import { withAuth } from "@/lib/middleware/auth-middleware"
import { withErrorHandler } from "@/lib/middleware/api-error-handler"
import { withPerformanceMonitoring } from "@/lib/middleware/performance-monitor"

async function syncLeaderboardHandler(request: NextRequest) {
  console.log('🔄 [API] sync-leaderboard: Запуск синхронизации через LeaderboardSyncService...')
  
  const syncService = new LeaderboardSyncService()
  const result = await syncService.syncTeacherData()
  
  if (result.success) {
    console.log('✅ [API] sync-leaderboard: Синхронизация завершена успешно')
    
    return NextResponse.json({
      success: true,
      teachers_in_profiles: result.teachersInProfiles,
      phantom_users_removed: result.phantomUsersRemoved,
      missing_teachers_added: result.missingTeachersAdded,
      final_teacher_count: result.finalTeacherCount,
      details: {
        phantoms_removed: result.details.phantomsRemoved,
        teachers_added: result.details.teachersAdded
      }
    })
  } else {
    throw new Error(result.error || 'Sync service returned unsuccessful result')
  }
}

// Применяем middleware для авторизации, обработки ошибок и мониторинга
export const POST = withAuth({
  requireAuth: true,
  allowedRoles: ['Administrator', 'Senior Teacher']
})(
  withErrorHandler(
    withPerformanceMonitoring(syncLeaderboardHandler, '/api/system/sync-leaderboard'),
    'sync-leaderboard'
  )
)
