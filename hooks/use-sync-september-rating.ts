"use client"

import { useState } from 'react'

export interface SyncResult {
  success: boolean
  duration?: string
  result?: {
    recordsProcessed: number
    recordsUpdated: number
    errors: string[]
    warnings: string[]
    startedAt: string
    completedAt: string
  }
  error?: string
  initiatedBy?: string
  timestamp: string
}

export interface SyncStatus {
  success: boolean
  status?: {
    lastSuccessfulSync?: string
    lastAttempt?: string
    lastResult: 'success' | 'error' | 'partial'
    isRunning: boolean
    nextScheduledSync?: string
  }
  timestamp: string
}

/**
 * Хук для управления синхронизацией September Rating с Pyrus
 */
export function useSyncSeptemberRating() {
  const [isLoading, setIsLoading] = useState(false)
  const [lastResult, setLastResult] = useState<SyncResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  /**
   * Запуск ручной синхронизации
   */
  const startSync = async (): Promise<SyncResult> => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/plugins/september-rating/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Включаем cookies для авторизации
      })

      const result: SyncResult = await response.json()

      if (!response.ok) {
        throw new Error(result.error || `HTTP ${response.status}`)
      }

      setLastResult(result)
      return result

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      setError(errorMessage)
      
      const errorResult: SyncResult = {
        success: false,
        error: errorMessage,
        timestamp: new Date().toISOString()
      }
      
      setLastResult(errorResult)
      return errorResult
      
    } finally {
      setIsLoading(false)
    }
  }

  /**
   * Получение статуса синхронизации
   */
  const getStatus = async (): Promise<SyncStatus> => {
    try {
      const response = await fetch('/api/plugins/september-rating/sync', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      })

      const status: SyncStatus = await response.json()

      if (!response.ok) {
        throw new Error(status.error || `HTTP ${response.status}`)
      }

      return status

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get status'
      
      return {
        success: false,
        error: errorMessage,
        timestamp: new Date().toISOString()
      }
    }
  }

  /**
   * Очистка состояния ошибки
   */
  const clearError = () => {
    setError(null)
  }

  return {
    isLoading,
    lastResult,
    error,
    startSync,
    getStatus,
    clearError
  }
}
