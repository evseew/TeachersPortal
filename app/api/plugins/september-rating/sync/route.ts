import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth/config'
import { hasAccess } from '@/lib/auth/permissions'
import { SeptemberRatingPyrusAdapter } from '@/plugins/september-rating/services/pyrus-adapter'

/**
 * API endpoint для ручного запуска синхронизации плагина September Rating
 * Доступен только администраторам
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now()
  
  try {
    // Проверка аутентификации
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Authentication required' }, 
        { status: 401 }
      )
    }
    
    // Проверка прав доступа (только администраторы)
    const userRole = session.user.role
    if (!hasAccess(userRole, 'system', 'write')) {
      return NextResponse.json(
        { error: 'Administrator access required' }, 
        { status: 403 }
      )
    }
    
    console.log(`[MANUAL-SYNC] September Rating sync initiated by ${session.user.email}`)
    
    // Создание адаптера и запуск синхронизации
    const adapter = new SeptemberRatingPyrusAdapter()
    const result = await adapter.sync()
    
    const duration = Date.now() - startTime
    
    // Логирование результатов
    if (result.success) {
      console.log(`[MANUAL-SYNC] ✅ Sync completed successfully in ${duration}ms by ${session.user.email}:`, {
        recordsProcessed: result.recordsProcessed,
        recordsUpdated: result.recordsUpdated,
        warnings: result.warnings?.length || 0
      })
    } else {
      console.error(`[MANUAL-SYNC] ❌ Sync failed in ${duration}ms for ${session.user.email}:`, {
        errors: result.errors?.length || 0,
        warnings: result.warnings?.length || 0
      })
    }
    
    return NextResponse.json({
      success: result.success,
      duration: `${duration}ms`,
      result: {
        recordsProcessed: result.recordsProcessed,
        recordsUpdated: result.recordsUpdated,
        errors: result.errors || [],
        warnings: result.warnings || [],
        startedAt: result.startedAt,
        completedAt: result.completedAt
      },
      initiatedBy: session.user.email,
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    const duration = Date.now() - startTime
    
    console.error('[MANUAL-SYNC] September Rating sync failed:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      duration: `${duration}ms`
    })
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      duration: `${duration}ms`,
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}

// GET метод для проверки статуса синхронизации
export async function GET(request: NextRequest) {
  try {
    // Проверка аутентификации
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Authentication required' }, 
        { status: 401 }
      )
    }
    
    // Проверка прав доступа
    const userRole = session.user.role
    if (!hasAccess(userRole, 'system', 'read')) {
      return NextResponse.json(
        { error: 'Insufficient permissions' }, 
        { status: 403 }
      )
    }
    
    const adapter = new SeptemberRatingPyrusAdapter()
    const status = await adapter.getSyncStatus()
    
    return NextResponse.json({
      success: true,
      status,
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    console.error('[SYNC-STATUS] Failed to get sync status:', error)
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}
