"use client"

import { useState, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { RefreshCw, CheckCircle, AlertCircle, Clock, User } from "lucide-react"
import { useSyncSeptemberRating } from "@/hooks/use-sync-september-rating"
import { useSession } from "next-auth/react"
import { hasAccess } from "@/lib/auth/permissions"
import { useToast } from "@/hooks/use-toast"

/**
 * Компонент кнопки ручной синхронизации September Rating
 * Доступен только администраторам
 */
export function SyncButton() {
  const { data: session } = useSession()
  const { isLoading, lastResult, error, startSync, getStatus, clearError } = useSyncSeptemberRating()
  const { toast } = useToast()
  const [showDetails, setShowDetails] = useState(false)

  // Проверяем права доступа - только администраторы
  const canSync = session?.user?.role && hasAccess(session.user.role, 'system', 'write')

  // Загружаем статус при монтировании
  useEffect(() => {
    if (canSync) {
      getStatus()
    }
  }, [canSync])

  const handleSync = async () => {
    clearError()
    
    // Показываем toast о начале синхронизации
    toast({
      title: "Синхронизация запущена",
      description: "Получение данных из Pyrus...",
    })
    
    const result = await startSync()
    
    if (result.success) {
      // Успешная синхронизация
      toast({
        title: "✅ Синхронизация завершена",
        description: `Обработано ${result.result?.recordsProcessed || 0} записей за ${result.duration}`,
      })
      
      setShowDetails(true)
      // Автоматически скрываем детали через 10 секунд
      setTimeout(() => setShowDetails(false), 10000)
    } else {
      // Ошибка синхронизации
      toast({
        title: "❌ Ошибка синхронизации",
        description: result.error || "Неизвестная ошибка",
        variant: "destructive",
      })
    }
  }

  // Если пользователь не администратор, не показываем кнопку
  if (!canSync) {
    return null
  }

  return (
    <div className="space-y-4">
      {/* Кнопка синхронизации */}
      <div className="flex items-center space-x-3">
        <Button
          onClick={handleSync}
          disabled={isLoading}
          variant="outline"
          size="sm"
          className="bg-white/10 hover:bg-white/20 text-white border-white/30 backdrop-blur-sm"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          {isLoading ? 'Синхронизация...' : 'Синхронизировать'}
        </Button>

        {/* Индикатор последнего результата */}
        {lastResult && !isLoading && (
          <div className="flex items-center space-x-2">
            {lastResult.success ? (
              <CheckCircle className="h-5 w-5 text-green-400" />
            ) : (
              <AlertCircle className="h-5 w-5 text-red-400" />
            )}
            <span className="text-sm text-white/80">
              {lastResult.success ? 'Успешно' : 'Ошибка'}
            </span>
          </div>
        )}
      </div>

      {/* Детали последней синхронизации */}
      {showDetails && lastResult && lastResult.success && lastResult.result && (
        <Card className="bg-white/10 border-white/20 backdrop-blur-sm">
          <CardContent className="p-4">
            <div className="space-y-2">
              <div className="flex items-center space-x-2 text-white">
                <CheckCircle className="h-4 w-4 text-green-400" />
                <span className="font-medium">Синхронизация завершена</span>
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-sm text-white/80">
                <div className="flex items-center space-x-2">
                  <User className="h-4 w-4" />
                  <span>Обработано: {lastResult.result.recordsProcessed}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <RefreshCw className="h-4 w-4" />
                  <span>Обновлено: {lastResult.result.recordsUpdated}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Clock className="h-4 w-4" />
                  <span>Время: {lastResult.duration}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <User className="h-4 w-4" />
                  <span>Автор: {lastResult.initiatedBy || 'System'}</span>
                </div>
              </div>

              {/* Предупреждения, если есть */}
              {lastResult.result.warnings && lastResult.result.warnings.length > 0 && (
                <div className="mt-3 p-2 bg-yellow-500/20 rounded-md">
                  <div className="text-sm text-yellow-200">
                    <strong>Предупреждения ({lastResult.result.warnings.length}):</strong>
                    <ul className="mt-1 space-y-1">
                      {lastResult.result.warnings.slice(0, 3).map((warning, index) => (
                        <li key={index} className="text-xs">• {warning}</li>
                      ))}
                      {lastResult.result.warnings.length > 3 && (
                        <li className="text-xs">• И еще {lastResult.result.warnings.length - 3}...</li>
                      )}
                    </ul>
                  </div>
                </div>
              )}

              <Button
                onClick={() => setShowDetails(false)}
                variant="ghost"
                size="sm"
                className="text-white/60 hover:text-white/80 h-6 px-2 text-xs"
              >
                Скрыть
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Ошибки */}
      {error && (
        <Card className="bg-red-500/20 border-red-400/30 backdrop-blur-sm">
          <CardContent className="p-4">
            <div className="flex items-start space-x-2">
              <AlertCircle className="h-4 w-4 text-red-400 mt-0.5" />
              <div className="flex-1">
                <div className="text-sm font-medium text-red-200">
                  Ошибка синхронизации
                </div>
                <div className="text-xs text-red-300 mt-1">
                  {error}
                </div>
              </div>
              <Button
                onClick={clearError}
                variant="ghost"
                size="sm"
                className="text-red-300 hover:text-red-200 h-6 px-2 text-xs"
              >
                ✕
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
