import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authConfig } from "@/lib/auth/config"

/**
 * Ручной запуск синхронизации пользователей (только для администраторов)
 * 
 * POST /api/system/sync-users/manual
 */
export async function POST(request: NextRequest) {
  try {
    // Проверяем авторизацию
    const session = await getServerSession(authConfig)
    
    if (!session?.user?.email) {
      return NextResponse.json({
        success: false,
        error: 'Требуется авторизация'
      }, { status: 401 })
    }
    
    // TODO: Добавить проверку роли администратора
    // Пока пропускаем для тестирования
    
    console.log(`👤 Ручной запуск синхронизации пользователем: ${session.user.email}`)
    
    // Вызываем основной endpoint синхронизации
    const baseUrl = request.nextUrl.origin
    const syncResponse = await fetch(`${baseUrl}/api/system/sync-users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    })
    
    const syncResult = await syncResponse.json()
    
    if (!syncResponse.ok) {
      throw new Error(syncResult.error || 'Ошибка синхронизации')
    }
    
    return NextResponse.json({
      success: true,
      message: 'Ручная синхронизация завершена',
      results: syncResult.results,
      initiatedBy: session.user.email,
      timestamp: new Date().toISOString()
    })
    
  } catch (error: any) {
    console.error('❌ Ошибка ручной синхронизации:', error)
    return NextResponse.json({
      success: false,
      error: error.message || 'Неизвестная ошибка',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}
