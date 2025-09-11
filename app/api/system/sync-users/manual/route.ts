import { NextRequest, NextResponse } from "next/server"

/**
 * Ручной запуск синхронизации пользователей
 * 
 * POST /api/system/sync-users/manual
 */
export async function POST(request: NextRequest) {
  try {
    console.log(`🔄 Ручной запуск синхронизации пользователей`)
    
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
