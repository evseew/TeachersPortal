import { NextRequest, NextResponse } from 'next/server'
import { PyrusClientFactory } from '@/lib/pyrus/client-factory'
import { PyrusSyncService } from '@/lib/services/pyrus-sync.service'
import { SeptemberRatingPyrusAdapter } from '@/plugins/september-rating/services/pyrus-adapter'

// Проверка авторизации для Vercel Cron
function isAuthorizedCronRequest(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization')
  
  // Vercel Cron отправляет Bearer токен с CRON_SECRET
  if (process.env.CRON_SECRET && authHeader === `Bearer ${process.env.CRON_SECRET}`) {
    return true
  }
  
  // В development режиме разрешаем без токена
  if (process.env.NODE_ENV === 'development') {
    return true
  }
  
  return false
}

export async function GET(request: NextRequest) {
  const startTime = Date.now()
  
  try {
    // Проверка авторизации
    if (!isAuthorizedCronRequest(request)) {
      console.log('[CRON] Unauthorized request to pyrus-sync')
      return NextResponse.json(
        { error: 'Unauthorized' }, 
        { status: 401 }
      )
    }
    
    console.log('[CRON] Starting Pyrus synchronization...')
    
    // Проверка переменных окружения
    if (!process.env.PYRUS_LOGIN || !process.env.PYRUS_SECURITY_KEY) {
      throw new Error('Missing required Pyrus environment variables (PYRUS_LOGIN, PYRUS_SECURITY_KEY)')
    }
    
    // Создание клиентов через фабрику
    const formsClient = PyrusClientFactory.createFormsClient()
    const teachersClient = PyrusClientFactory.createTeachersClient()
    
    // Создание сервиса синхронизации
    const syncService = new PyrusSyncService(formsClient, teachersClient)
    
    // Создание адаптера плагина September Rating
    const adapter = new SeptemberRatingPyrusAdapter()
    
    // Запуск синхронизации
    const result = await adapter.sync()
    
    const duration = Date.now() - startTime
    
    // Логирование результатов
    if (result.success) {
      console.log(`[CRON] ✅ Pyrus sync completed successfully in ${duration}ms:`, {
        recordsProcessed: result.recordsProcessed,
        recordsUpdated: result.recordsUpdated,
        warnings: result.warnings?.length || 0
      })
    } else {
      console.error(`[CRON] ❌ Pyrus sync completed with errors in ${duration}ms:`, {
        recordsProcessed: result.recordsProcessed,
        recordsUpdated: result.recordsUpdated,
        errors: result.errors?.length || 0,
        warnings: result.warnings?.length || 0
      })
      
      // Логируем конкретные ошибки для мониторинга
      if (result.errors && result.errors.length > 0) {
        result.errors.forEach((error, index) => {
          console.error(`[CRON] Error ${index + 1}:`, error)
        })
      }
    }
    
    // Логируем предупреждения если есть
    if (result.warnings && result.warnings.length > 0) {
      result.warnings.forEach((warning, index) => {
        console.warn(`[CRON] Warning ${index + 1}:`, warning)
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
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    const duration = Date.now() - startTime
    
    console.error('[CRON] Pyrus sync failed:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      duration: `${duration}ms`
    })
    
    // Возвращаем 200 статус чтобы Vercel не считал это ошибкой cron job
    // Но логируем ошибку для мониторинга
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      duration: `${duration}ms`,
      timestamp: new Date().toISOString()
    }, { status: 200 })
  }
}

// POST метод для ручного запуска (для тестирования)
export async function POST(request: NextRequest) {
  // Переиспользуем логику GET метода
  return GET(request)
}
