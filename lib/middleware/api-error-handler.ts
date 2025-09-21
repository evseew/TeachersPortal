/**
 * Унифицированная обработка ошибок для API
 * Цель: Устранить дублирование error handling логики
 */

import { NextResponse } from 'next/server'

export class ApiError extends Error {
  statusCode?: number
  code?: string
  details?: any

  constructor(message: string, statusCode?: number, code?: string, details?: any) {
    super(message)
    this.name = 'ApiError'
    this.statusCode = statusCode
    this.code = code
    this.details = details
  }
}

export interface ErrorResponse {
  error: string
  code?: string
  details?: any
  timestamp: string
  requestId?: string
}

export class ApiErrorHandler {
  /**
   * Обрабатывает ошибки и возвращает унифицированный ответ
   */
  static handleError(error: any, context?: string): NextResponse<ErrorResponse> {
    const timestamp = new Date().toISOString()
    const requestId = Math.random().toString(36).substring(7)

    // Логируем ошибку
    console.error(`❌ [API Error] ${context || 'Unknown context'}:`, {
      error: error.message || error,
      stack: error.stack,
      timestamp,
      requestId
    })

    // Определяем статус код
    let statusCode = 500
    let errorMessage = 'Internal server error'
    let errorCode = 'INTERNAL_ERROR'
    let details = undefined

    if (error instanceof ApiError) {
      statusCode = error.statusCode || 500
      errorMessage = error.message
      errorCode = error.code || 'API_ERROR'
      details = error.details
    } else if (error?.code === 'PGRST116') {
      // Supabase: записи не найдены
      statusCode = 404
      errorMessage = 'Записи не найдены'
      errorCode = 'NOT_FOUND'
    } else if (error?.code === 'PGRST301') {
      // Supabase: нарушение ограничений
      statusCode = 400
      errorMessage = 'Нарушение ограничений базы данных'
      errorCode = 'CONSTRAINT_VIOLATION'
    } else if (error?.message?.includes('auth')) {
      statusCode = 401
      errorMessage = 'Ошибка авторизации'
      errorCode = 'AUTH_ERROR'
    } else if (error?.message?.includes('permission')) {
      statusCode = 403
      errorMessage = 'Недостаточно прав'
      errorCode = 'PERMISSION_DENIED'
    } else if (error?.message?.includes('validation')) {
      statusCode = 400
      errorMessage = error.message
      errorCode = 'VALIDATION_ERROR'
    } else if (error?.message) {
      errorMessage = error.message
    }

    const response: ErrorResponse = {
      error: errorMessage,
      code: errorCode,
      timestamp,
      requestId
    }

    if (details) {
      response.details = details
    }

    return NextResponse.json(response, { status: statusCode })
  }

  /**
   * Создает специфическую ошибку API
   */
  static createError(message: string, statusCode: number = 500, code?: string, details?: any): ApiError {
    const error = new Error(message) as ApiError
    error.statusCode = statusCode
    error.code = code
    error.details = details
    return error
  }

  /**
   * Валидационная ошибка
   */
  static validationError(message: string, details?: any): ApiError {
    return this.createError(message, 400, 'VALIDATION_ERROR', details)
  }

  /**
   * Ошибка авторизации
   */
  static authError(message: string = 'Необходима авторизация'): ApiError {
    return this.createError(message, 401, 'AUTH_ERROR')
  }

  /**
   * Ошибка прав доступа
   */
  static permissionError(message: string = 'Недостаточно прав'): ApiError {
    return this.createError(message, 403, 'PERMISSION_DENIED')
  }

  /**
   * Ошибка "не найдено"
   */
  static notFoundError(message: string = 'Ресурс не найден'): ApiError {
    return this.createError(message, 404, 'NOT_FOUND')
  }

  /**
   * Конфликт данных
   */
  static conflictError(message: string, details?: any): ApiError {
    return this.createError(message, 409, 'CONFLICT', details)
  }
}

/**
 * Декоратор для автоматической обработки ошибок в API роутах
 */
export function withErrorHandler(handler: Function, context?: string) {
  return async (...args: any[]) => {
    try {
      return await handler(...args)
    } catch (error) {
      return ApiErrorHandler.handleError(error, context)
    }
  }
}

/**
 * Middleware для обработки ошибок в async функциях
 */
export async function safeApiCall<T>(
  asyncFn: () => Promise<T>,
  context?: string
): Promise<T | NextResponse<ErrorResponse>> {
  try {
    return await asyncFn()
  } catch (error) {
    return ApiErrorHandler.handleError(error, context)
  }
}
