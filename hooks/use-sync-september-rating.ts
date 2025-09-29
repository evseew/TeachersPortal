"use client"

import { useState } from 'react'
import type { 
  SyncResult, 
  DetailedSyncStatus, 
  SyncProgressStep,
  UseSyncSeptemberRatingResult 
} from '@/lib/types/september-rating'

/**
 * Хук для управления синхронизацией September Rating с Pyrus
 */
export function useSyncSeptemberRating(): UseSyncSeptemberRatingResult {
  const [isLoading, setIsLoading] = useState(false)
  const [lastResult, setLastResult] = useState<SyncResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [progress, setProgress] = useState<SyncProgressStep | null>(null)

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
        recordsProcessed: 0,
        recordsUpdated: 0,
        startedAt: new Date(),
        errors: [errorMessage]
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
  const getStatus = async (): Promise<DetailedSyncStatus> => {
    try {
      const response = await fetch('/api/plugins/september-rating/sync', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      })

      const status = await response.json() as DetailedSyncStatus

      if (!response.ok) {
        throw new Error(status.error || `HTTP ${response.status}`)
      }

      return status

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get status'
      
      return {
        formsStatus: {
          oldies: { recordCount: 0, errors: [errorMessage], warnings: [], status: 'error' },
          trial: { recordCount: 0, errors: [errorMessage], warnings: [], status: 'error' }
        },
        dataFreshness: { oldies: 'outdated', trial: 'outdated' },
        isRunning: false
      }
    }
  }

  /**
   * Очистка состояния ошибки
   */
  const clearError = () => {
    setError(null)
  }

  /**
   * Отмена текущей синхронизации
   */
  const cancelSync = async (): Promise<void> => {
    // TODO: Реализовать отмену синхронизации
    setIsLoading(false)
    setProgress(null)
  }

  return {
    isLoading,
    lastResult,
    error,
    progress,
    startSync,
    getStatus,
    clearError,
    cancelSync
  }
}
