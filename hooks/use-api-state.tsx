/**
 * Универсальный хук для управления состоянием API запросов
 * Цель: Устранить дублирование loading/error/data логики
 */

"use client"

import { useState, useEffect, useCallback, useRef } from 'react'

export interface ApiStateOptions {
  immediate?: boolean           // Выполнить запрос сразу при монтировании
  cacheTime?: number           // Время кэширования в миллисекундах
  retryAttempts?: number       // Количество попыток повтора при ошибке
  retryDelay?: number          // Задержка между попытками повтора
  onSuccess?: (data: any) => void
  onError?: (error: Error) => void
  dependencies?: any[]         // Зависимости для автоматического обновления
}

export interface ApiState<T> {
  data: T | null
  loading: boolean
  error: string | null
  lastFetch: Date | null
  retryCount: number
}

export interface ApiStateActions {
  execute: () => Promise<void>
  retry: () => Promise<void>
  reset: () => void
  clearError: () => void
}

export interface ApiStateReturn<T> extends ApiState<T>, ApiStateActions {
  isStale: boolean
  canRetry: boolean
}

export function useApiState<T>(
  fetchFn: () => Promise<T>,
  options: ApiStateOptions = {}
): ApiStateReturn<T> {
  const {
    immediate = true,
    cacheTime = 0,
    retryAttempts = 0,
    retryDelay = 1000,
    onSuccess,
    onError,
    dependencies = []
  } = options

  const [state, setState] = useState<ApiState<T>>({
    data: null,
    loading: false,
    error: null,
    lastFetch: null,
    retryCount: 0
  })

  const abortController = useRef<AbortController | null>(null)
  const retryTimeout = useRef<NodeJS.Timeout | null>(null)

  // Основная функция выполнения запроса
  const execute = useCallback(async (isRetry = false) => {
    // Отменяем предыдущий запрос
    if (abortController.current) {
      abortController.current.abort()
    }

    // Создаем новый AbortController
    abortController.current = new AbortController()

    try {
      if (!isRetry) {
        setState(prev => ({ 
          ...prev, 
          loading: true, 
          error: null,
          retryCount: 0
        }))
      } else {
        setState(prev => ({ 
          ...prev, 
          loading: true, 
          error: null 
        }))
      }

      const data = await fetchFn()

      // Проверяем что запрос не был отменен
      if (abortController.current?.signal.aborted) {
        return
      }

      setState(prev => ({
        ...prev,
        data,
        loading: false,
        error: null,
        lastFetch: new Date(),
        retryCount: 0
      }))

      onSuccess?.(data)

    } catch (error: any) {
      // Игнорируем ошибки отмененных запросов
      if (error.name === 'AbortError' || abortController.current?.signal.aborted) {
        return
      }

      console.error('API State Error:', error)

      const errorMessage = error?.message ?? 'Произошла ошибка при загрузке данных'

      setState(prev => {
        const newRetryCount = isRetry ? prev.retryCount + 1 : 1
        
        return {
          ...prev,
          loading: false,
          error: errorMessage,
          retryCount: newRetryCount
        }
      })

      onError?.(error)

      // Автоматический повтор если настроен
      if (retryAttempts > 0 && state.retryCount < retryAttempts) {
        retryTimeout.current = setTimeout(() => {
          execute(true)
        }, retryDelay)
      }
    }
  }, [fetchFn, retryAttempts, retryDelay, onSuccess, onError, state.retryCount])

  // Ручной повтор
  const retry = useCallback(async () => {
    if (retryTimeout.current) {
      clearTimeout(retryTimeout.current)
      retryTimeout.current = null
    }
    await execute(true)
  }, [execute])

  // Сброс состояния
  const reset = useCallback(() => {
    if (abortController.current) {
      abortController.current.abort()
    }
    if (retryTimeout.current) {
      clearTimeout(retryTimeout.current)
      retryTimeout.current = null
    }

    setState({
      data: null,
      loading: false,
      error: null,
      lastFetch: null,
      retryCount: 0
    })
  }, [])

  // Очистка ошибки
  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }))
  }, [])

  // Проверка устаревания данных
  const isStale = cacheTime > 0 && state.lastFetch 
    ? Date.now() - state.lastFetch.getTime() > cacheTime
    : false

  // Можно ли повторить запрос
  const canRetry = !state.loading && (
    state.error !== null || 
    (retryAttempts > 0 && state.retryCount < retryAttempts)
  )

  // Выполнение при монтировании
  useEffect(() => {
    if (immediate) {
      execute()
    }

    return () => {
      if (abortController.current) {
        abortController.current.abort()
      }
      if (retryTimeout.current) {
        clearTimeout(retryTimeout.current)
      }
    }
  }, []) // Только при монтировании

  // Выполнение при изменении зависимостей
  useEffect(() => {
    if (dependencies.length > 0) {
      execute()
    }
  }, dependencies)

  // Автоматическое обновление устаревших данных
  useEffect(() => {
    if (isStale && !state.loading && !state.error) {
      execute()
    }
  }, [isStale, state.loading, state.error, execute])

  return {
    // Состояние
    data: state.data,
    loading: state.loading,
    error: state.error,
    lastFetch: state.lastFetch,
    retryCount: state.retryCount,
    isStale,
    canRetry,
    
    // Действия
    execute: () => execute(false),
    retry,
    reset,
    clearError
  }
}

// Вспомогательный хук для списков с пагинацией
export function useApiList<T>(
  fetchFn: (params: { page?: number; limit?: number; search?: string }) => Promise<T[]>,
  options: ApiStateOptions & { 
    initialPage?: number
    pageSize?: number
    searchDebounce?: number
  } = {}
) {
  const { initialPage = 1, pageSize = 20, searchDebounce = 300 } = options
  
  const [page, setPage] = useState(initialPage)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')

  // Debounce поиска
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search)
    }, searchDebounce)

    return () => clearTimeout(timer)
  }, [search, searchDebounce])

  // API состояние с параметрами
  const apiState = useApiState(
    () => fetchFn({ page, limit: pageSize, search: debouncedSearch }),
    {
      ...options,
      dependencies: [page, debouncedSearch]
    }
  )

  const setSearchValue = useCallback((value: string) => {
    setSearch(value)
    setPage(1) // Сброс на первую страницу при поиске
  }, [])

  const nextPage = useCallback(() => {
    setPage(prev => prev + 1)
  }, [])

  const previousPage = useCallback(() => {
    setPage(prev => Math.max(1, prev - 1))
  }, [])

  const goToPage = useCallback((newPage: number) => {
    setPage(Math.max(1, newPage))
  }, [])

  return {
    ...apiState,
    page,
    search,
    hasMore: (apiState.data?.length || 0) === pageSize,
    setSearch: setSearchValue,
    nextPage,
    previousPage,
    goToPage
  }
}

// Типы уже экспортированы выше, дублирование не нужно
