/**
 * API для мониторинга производительности системы
 * Цель: Предоставить информацию о производительности API и БД
 */

import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/middleware/auth-middleware'
import { withErrorHandler } from '@/lib/middleware/api-error-handler'
import { getOverallStats, getEndpointStats, exportMetrics, cleanupMetrics } from '@/lib/middleware/performance-monitor'
import { supabaseAdmin } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

async function performanceHandler(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const action = searchParams.get('action')
  const endpoint = searchParams.get('endpoint')
  const format = searchParams.get('format') as 'json' | 'csv' | null

  switch (action) {
    case 'overall':
      return NextResponse.json({
        success: true,
        data: getOverallStats()
      })

    case 'endpoint':
      if (!endpoint) {
        return NextResponse.json(
          { error: 'Endpoint parameter is required' },
          { status: 400 }
        )
      }
      
      const stats = getEndpointStats(endpoint)
      if (!stats) {
        return NextResponse.json(
          { error: 'No stats found for this endpoint' },
          { status: 404 }
        )
      }

      return NextResponse.json({
        success: true,
        data: stats
      })

    case 'export':
      const exportData = exportMetrics(format || 'json')
      
      if (format === 'csv') {
        return new NextResponse(exportData, {
          headers: {
            'Content-Type': 'text/csv',
            'Content-Disposition': 'attachment; filename=performance-metrics.csv'
          }
        })
      }

      return NextResponse.json({
        success: true,
        data: JSON.parse(exportData)
      })

    case 'cleanup':
      const hours = parseInt(searchParams.get('hours') || '24')
      cleanupMetrics(hours)
      
      return NextResponse.json({
        success: true,
        message: `Cleaned up metrics older than ${hours} hours`
      })

    case 'database':
      // Статистика БД
      try {
        const dbStats = await getDatabaseStats()
        return NextResponse.json({
          success: true,
          data: dbStats
        })
      } catch (error: unknown) {
        throw new Error(`Database stats error: ${error.message}`)
      }

    case 'system':
      // Системная статистика (комбинированная)
      try {
        const [apiStats, dbStats] = await Promise.all([
          getOverallStats(),
          getDatabaseStats()
        ])

        return NextResponse.json({
          success: true,
          data: {
            api: apiStats,
            database: dbStats,
            timestamp: new Date().toISOString()
          }
        })
      } catch (error: unknown) {
        throw new Error(`System stats error: ${error.message}`)
      }

    default:
      return NextResponse.json(
        { error: 'Invalid action. Available: overall, endpoint, export, cleanup, database, system' },
        { status: 400 }
      )
  }
}

async function getDatabaseStats() {
  try {
    // Получаем статистику из новой RPC функции
    const { data: recomputeStats, error: recomputeError } = await supabaseAdmin
      .rpc('get_recompute_stats')
    
    if (recomputeError) throw recomputeError

    // Получаем статистику подключений и производительности БД
    const { data: connectionStats, error: connectionError } = await supabaseAdmin
      .from('profiles')
      .select('*', { count: 'exact', head: true })

    if (connectionError) throw connectionError

    // Базовая статистика таблиц
    const tableStats = await Promise.all([
      supabaseAdmin.from('profiles').select('*', { count: 'exact', head: true }),
      supabaseAdmin.from('branch').select('*', { count: 'exact', head: true }),
      supabaseAdmin.from('teacher_metrics').select('*', { count: 'exact', head: true }),
      supabaseAdmin.from('current_scores').select('*', { count: 'exact', head: true }),
      supabaseAdmin.from('snapshots').select('*', { count: 'exact', head: true })
    ])

    const [profilesCount, branchesCount, metricsCount, scoresCount, snapshotsCount] = tableStats

    return {
      recompute_stats: recomputeStats,
      table_counts: {
        profiles: profilesCount.count,
        branches: branchesCount.count,
        teacher_metrics: metricsCount.count,
        current_scores: scoresCount.count,
        snapshots: snapshotsCount.count
      },
      health: {
        status: 'healthy',
        last_check: new Date().toISOString()
      }
    }
  } catch (error: unknown) {
    console.error('Database stats error:', error)
    return {
      error: error.message,
      health: {
        status: 'error',
        last_check: new Date().toISOString()
      }
    }
  }
}

// Применяем middleware
export const GET = withAuth({
  requireAuth: true,
  allowedRoles: ['Administrator']
})(
  withErrorHandler(performanceHandler, 'performance-api')
)
