/**
 * Мониторинг производительности API
 * Цель: Отслеживание времени выполнения и выявление узких мест
 */

import { NextRequest, NextResponse } from 'next/server'

export interface PerformanceMetric {
  endpoint: string
  method: string
  duration: number
  statusCode: number
  timestamp: string
  requestId: string
  userAgent?: string
  ip?: string
  queryParams?: Record<string, string>
  bodySize?: number
  responseSize?: number
}

export interface PerformanceStats {
  endpoint: string
  totalRequests: number
  averageDuration: number
  minDuration: number
  maxDuration: number
  errorRate: number
  lastRequest: string
}

class PerformanceMonitor {
  private metrics: PerformanceMetric[] = []
  private readonly maxMetrics = 1000 // Ограничиваем размер в памяти

  /**
   * Записывает метрику производительности
   */
  recordMetric(metric: PerformanceMetric): void {
    this.metrics.push(metric)

    // Ограничиваем размер массива
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics)
    }

    // Логируем медленные запросы
    if (metric.duration > 5000) { // > 5 секунд
      console.warn(`🐌 [Performance] Slow request detected:`, {
        endpoint: metric.endpoint,
        duration: `${metric.duration}ms`,
        method: metric.method,
        statusCode: metric.statusCode
      })
    }

    // Логируем ошибки
    if (metric.statusCode >= 400) {
      console.error(`❌ [Performance] API error:`, {
        endpoint: metric.endpoint,
        statusCode: metric.statusCode,
        duration: `${metric.duration}ms`
      })
    }
  }

  /**
   * Получает статистику по эндпоинту
   */
  getEndpointStats(endpoint: string): PerformanceStats | null {
    const endpointMetrics = this.metrics.filter(m => m.endpoint === endpoint)
    
    if (endpointMetrics.length === 0) {
      return null
    }

    const durations = endpointMetrics.map(m => m.duration)
    const errors = endpointMetrics.filter(m => m.statusCode >= 400)

    return {
      endpoint,
      totalRequests: endpointMetrics.length,
      averageDuration: Math.round(durations.reduce((sum, d) => sum + d, 0) / durations.length),
      minDuration: Math.min(...durations),
      maxDuration: Math.max(...durations),
      errorRate: Math.round((errors.length / endpointMetrics.length) * 100),
      lastRequest: endpointMetrics[endpointMetrics.length - 1].timestamp
    }
  }

  /**
   * Получает общую статистику
   */
  getOverallStats(): {
    totalRequests: number
    averageDuration: number
    errorRate: number
    topSlowEndpoints: Array<{ endpoint: string; avgDuration: number }>
    topErrorEndpoints: Array<{ endpoint: string; errorRate: number }>
  } {
    if (this.metrics.length === 0) {
      return {
        totalRequests: 0,
        averageDuration: 0,
        errorRate: 0,
        topSlowEndpoints: [],
        topErrorEndpoints: []
      }
    }

    // Группируем по эндпоинтам
    const endpointGroups = this.metrics.reduce((groups, metric) => {
      if (!groups[metric.endpoint]) {
        groups[metric.endpoint] = []
      }
      groups[metric.endpoint].push(metric)
      return groups
    }, {} as Record<string, PerformanceMetric[]>)

    // Считаем статистику по эндпоинтам
    const endpointStats = Object.entries(endpointGroups).map(([endpoint, metrics]) => {
      const durations = metrics.map(m => m.duration)
      const errors = metrics.filter(m => m.statusCode >= 400)
      
      return {
        endpoint,
        avgDuration: Math.round(durations.reduce((sum, d) => sum + d, 0) / durations.length),
        errorRate: Math.round((errors.length / metrics.length) * 100)
      }
    })

    // Общая статистика
    const totalDuration = this.metrics.reduce((sum, m) => sum + m.duration, 0)
    const totalErrors = this.metrics.filter(m => m.statusCode >= 400).length

    return {
      totalRequests: this.metrics.length,
      averageDuration: Math.round(totalDuration / this.metrics.length),
      errorRate: Math.round((totalErrors / this.metrics.length) * 100),
      topSlowEndpoints: endpointStats
        .sort((a, b) => b.avgDuration - a.avgDuration)
        .slice(0, 5),
      topErrorEndpoints: endpointStats
        .filter(s => s.errorRate > 0)
        .sort((a, b) => b.errorRate - a.errorRate)
        .slice(0, 5)
    }
  }

  /**
   * Очищает старые метрики
   */
  cleanup(olderThanHours: number = 24): void {
    const cutoffTime = new Date(Date.now() - olderThanHours * 60 * 60 * 1000)
    const initialCount = this.metrics.length
    
    this.metrics = this.metrics.filter(m => 
      new Date(m.timestamp) > cutoffTime
    )

    const removedCount = initialCount - this.metrics.length
    if (removedCount > 0) {
      console.log(`🧹 [Performance] Cleaned up ${removedCount} old metrics`)
    }
  }

  /**
   * Экспортирует метрики в формате для анализа
   */
  exportMetrics(format: 'json' | 'csv' = 'json'): string {
    if (format === 'csv') {
      const headers = 'endpoint,method,duration,statusCode,timestamp,requestId'
      const rows = this.metrics.map(m => 
        `${m.endpoint},${m.method},${m.duration},${m.statusCode},${m.timestamp},${m.requestId}`
      )
      return [headers, ...rows].join('\n')
    }

    return JSON.stringify(this.metrics, null, 2)
  }
}

// Singleton instance
const performanceMonitor = new PerformanceMonitor()

/**
 * Middleware для автоматического мониторинга производительности
 */
export function withPerformanceMonitoring<T extends (...args: any[]) => any>(
  handler: T,
  endpointName?: string
): T {
  return (async (...args: any[]) => {
    const request = args[0] as NextRequest
    const startTime = Date.now()
    const requestId = Math.random().toString(36).substring(7)
    
    // Определяем имя эндпоинта
    const endpoint = endpointName || request.url?.split('?')[0] || 'unknown'
    
    try {
      const response = await handler(...args)
      const duration = Date.now() - startTime
      
      // Определяем статус код из ответа
      let statusCode = 200
      if (response instanceof NextResponse) {
        statusCode = response.status
      }

      // Записываем метрику
      const metric: PerformanceMetric = {
        endpoint,
        method: request.method,
        duration,
        statusCode,
        timestamp: new Date().toISOString(),
        requestId,
        userAgent: request.headers.get('user-agent') || undefined,
        ip: request.headers.get('x-forwarded-for') || 
            request.headers.get('x-real-ip') || undefined,
        queryParams: Object.fromEntries(new URL(request.url).searchParams.entries())
      }

      performanceMonitor.recordMetric(metric)

      return response
    } catch (error) {
      const duration = Date.now() - startTime
      
      // Записываем метрику ошибки
      const metric: PerformanceMetric = {
        endpoint,
        method: request.method,
        duration,
        statusCode: 500,
        timestamp: new Date().toISOString(),
        requestId
      }

      performanceMonitor.recordMetric(metric)
      
      throw error
    }
  }) as T
}

/**
 * Функции для получения статистики
 */
export const getEndpointStats = (endpoint: string) => 
  performanceMonitor.getEndpointStats(endpoint)

export const getOverallStats = () => 
  performanceMonitor.getOverallStats()

export const exportMetrics = (format: 'json' | 'csv' = 'json') => 
  performanceMonitor.exportMetrics(format)

export const cleanupMetrics = (olderThanHours: number = 24) => 
  performanceMonitor.cleanup(olderThanHours)

/**
 * Автоматическая очистка метрик каждый час
 */
if (typeof window === 'undefined') { // Только на сервере
  setInterval(() => {
    performanceMonitor.cleanup(24)
  }, 60 * 60 * 1000) // Каждый час
}

export { performanceMonitor }
