"use client"

import { useEffect, useState } from 'react'
import { Card, CardContent } from "@/components/ui/card"
import { Clock, RefreshCw, AlertTriangle, CheckCircle2, Info } from "lucide-react"
import { useSyncSeptemberRating } from "@/hooks/use-sync-september-rating"
import { useSession } from "next-auth/react"

/**
 * Компонент информации о синхронизации September Rating
 * Показывает статус последней синхронизации и расписание
 */
export function SyncInfo() {
  const { data: session } = useSession()
  const { getStatus } = useSyncSeptemberRating()
  const [syncStatus, setSyncStatus] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  // Загружаем статус при монтировании
  useEffect(() => {
    loadStatus()
    
    // Обновляем статус каждые 5 минут
    const interval = setInterval(loadStatus, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  const loadStatus = async () => {
    setLoading(true)
    try {
      const status = await getStatus()
      setSyncStatus(status)
    } catch (error) {
      console.warn('Failed to load sync status:', error)
    } finally {
      setLoading(false)
    }
  }

  // Форматируем дату для отображения
  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Неизвестно'
    
    try {
      const date = new Date(dateString)
      return date.toLocaleString('ru-RU', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    } catch {
      return 'Неизвестно'
    }
  }

  // Получаем следующее время синхронизации (каждый час в начале часа)
  const getNextSyncTime = () => {
    const now = new Date()
    const nextHour = new Date(now)
    nextHour.setHours(now.getHours() + 1, 0, 0, 0)
    
    return formatDate(nextHour.toISOString())
  }

  const getStatusIcon = () => {
    if (loading) {
      return <RefreshCw className="h-4 w-4 animate-spin text-blue-500" />
    }

    if (!syncStatus?.success) {
      return <AlertTriangle className="h-4 w-4 text-red-500" />
    }

    const lastResult = syncStatus.status?.lastResult
    if (lastResult === 'success') {
      return <CheckCircle2 className="h-4 w-4 text-green-500" />
    } else if (lastResult === 'error') {
      return <AlertTriangle className="h-4 w-4 text-red-500" />
    } else if (lastResult === 'partial') {
      return <AlertTriangle className="h-4 w-4 text-yellow-500" />
    }

    return <Info className="h-4 w-4 text-gray-500" />
  }

  const getStatusText = () => {
    if (loading) return 'Проверка статуса...'
    
    if (!syncStatus?.success) {
      return 'Не удалось получить статус'
    }

    const status = syncStatus.status
    if (!status) return 'Статус неизвестен'

    const lastResult = status.lastResult
    if (lastResult === 'success') {
      return 'Последняя синхронизация успешна'
    } else if (lastResult === 'error') {
      return 'Ошибка при последней синхронизации'
    } else if (lastResult === 'partial') {
      return 'Частичная синхронизация'
    }

    return 'Синхронизация не выполнялась'
  }

  return (
    <Card className="bg-muted/50 border-muted">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              {getStatusIcon()}
              <span className="text-sm font-medium">
                Синхронизация с Pyrus
              </span>
            </div>
            
            <div className="text-sm text-muted-foreground space-y-1">
              <p>{getStatusText()}</p>
              
              {syncStatus?.status?.lastSuccessfulSync && (
                <div className="flex items-center space-x-2">
                  <CheckCircle2 className="h-3 w-3 text-green-500" />
                  <span className="text-xs">
                    Последняя успешная: {formatDate(syncStatus.status.lastSuccessfulSync)}
                  </span>
                </div>
              )}
              
              <div className="flex items-center space-x-2">
                <Clock className="h-3 w-3 text-blue-500" />
                <span className="text-xs">
                  Следующая: {getNextSyncTime()}
                </span>
              </div>
            </div>
          </div>

          <div className="text-right">
            <div className="text-xs text-muted-foreground space-y-1">
              <div>Расписание: каждый час</div>
              <div>Формы: 2304918, 792300</div>
              {session?.user?.role === 'Administrator' && (
                <div className="text-blue-600">
                  Доступна ручная синхронизация
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
