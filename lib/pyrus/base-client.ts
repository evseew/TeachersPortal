/**
 * Базовый клиент для работы с Pyrus API (v4)
 * 
 * Основные возможности:
 * - Авторизация и получение access_token
 * - Базовые HTTP методы с обработкой ошибок
 * - Retry логика для устойчивости
 */

interface PyrusAuthResponse {
  access_token: string
}

interface PyrusErrorResponse {
  error: string
  error_description?: string
}

export interface PyrusRequestOptions {
  retries?: number
  timeout?: number
  headers?: Record<string, string>
}

export abstract class PyrusBaseClient {
  protected baseUrl: string
  protected login: string | null
  protected securityKey: string | null
  protected accessToken: string | null = null
  protected tokenExpiry: Date | null = null

  constructor() {
    this.baseUrl = process.env.PYRUS_API_URL || "https://api.pyrus.com/v4/"
    this.login = process.env.PYRUS_LOGIN || null
    this.securityKey = process.env.PYRUS_SECURITY_KEY || null
  }

  /**
   * Соединяет базовый URL с путем
   */
  protected joinUrl(base: string, path: string): string {
    const cleanBase = base.endsWith('/') ? base : base + '/'
    const cleanPath = path.startsWith('/') ? path.substring(1) : path
    return cleanBase + cleanPath
  }

  /**
   * Авторизация в Pyrus и получение access_token
   */
  protected async authenticate(): Promise<string | null> {
    if (!this.login || !this.securityKey) {
      console.error('PyrusBaseClient: отсутствуют учетные данные')
      return null
    }

    try {
      const response = await fetch(this.joinUrl(this.baseUrl, 'auth'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          login: this.login,
          security_key: this.securityKey,
        }),
      })

      if (!response.ok) {
        const errorData: PyrusErrorResponse = await response.json().catch(() => ({}))
        console.error(`PyrusBaseClient: ошибка авторизации ${response.status}`, errorData)
        return null
      }

      const data: PyrusAuthResponse = await response.json()
      this.accessToken = data.access_token
      
      // Токен действует 24 часа, устанавливаем срок истечения
      this.tokenExpiry = new Date(Date.now() + 23 * 60 * 60 * 1000) // 23 часа для безопасности
      
      return this.accessToken
    } catch (error) {
      console.error('PyrusBaseClient: ошибка при авторизации', error)
      return null
    }
  }

  /**
   * Получение действующего access_token с проверкой срока действия
   */
  protected async getToken(): Promise<string | null> {
    // Проверяем наличие токена и срок его действия
    if (this.accessToken && this.tokenExpiry && new Date() < this.tokenExpiry) {
      return this.accessToken
    }
    
    // Токен отсутствует или истек, получаем новый
    return await this.authenticate()
  }

  /**
   * Базовый HTTP запрос с retry логикой и обработкой ошибок
   */
  protected async makeRequest<T>(
    endpoint: string, 
    options: RequestInit = {}, 
    requestOptions: PyrusRequestOptions = {}
  ): Promise<T | null> {
    const { retries = 3, timeout = 30000, headers = {} } = requestOptions
    const token = await this.getToken()
    
    if (!token) {
      console.error('PyrusBaseClient: не удалось получить токен для запроса')
      return null
    }

    const url = this.joinUrl(this.baseUrl, endpoint)
    const requestInit: RequestInit = {
      ...options,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...headers,
        ...options.headers,
      },
    }

    let lastError: Error | null = null

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        // Создаем AbortController для timeout
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), timeout)

        const response = await fetch(url, {
          ...requestInit,
          signal: controller.signal,
        })

        clearTimeout(timeoutId)

        if (!response.ok) {
          // Если токен истек, пытаемся получить новый и повторить запрос
          if (response.status === 401) {
            console.warn(`PyrusBaseClient: токен истек, обновляем... (попытка ${attempt})`)
            this.accessToken = null
            this.tokenExpiry = null
            
            if (attempt < retries) {
              continue // Повторяем запрос с новым токеном
            }
          }

          const errorData: PyrusErrorResponse = await response.json().catch(() => ({}))
          throw new Error(`HTTP ${response.status}: ${errorData.error || response.statusText}`)
        }

        const data: T = await response.json()
        return data

      } catch (error) {
        lastError = error as Error
        console.warn(`PyrusBaseClient: ошибка запроса к ${endpoint} (попытка ${attempt}/${retries}):`, error)
        
        // Если это не последняя попытка, ждем перед повтором
        if (attempt < retries) {
          const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000) // Экспоненциальная задержка, макс 10 сек
          await new Promise(resolve => setTimeout(resolve, delay))
        }
      }
    }

    console.error(`PyrusBaseClient: все попытки исчерпаны для ${endpoint}`)
    return null
  }

  /**
   * GET запрос
   */
  protected async get<T>(endpoint: string, options: PyrusRequestOptions = {}): Promise<T | null> {
    return this.makeRequest<T>(endpoint, { method: 'GET' }, options)
  }

  /**
   * POST запрос
   */
  protected async post<T>(
    endpoint: string, 
    data?: any, 
    options: PyrusRequestOptions = {}
  ): Promise<T | null> {
    return this.makeRequest<T>(
      endpoint, 
      { 
        method: 'POST', 
        body: data ? JSON.stringify(data) : undefined 
      }, 
      options
    )
  }

  /**
   * PUT запрос
   */
  protected async put<T>(
    endpoint: string, 
    data?: any, 
    options: PyrusRequestOptions = {}
  ): Promise<T | null> {
    return this.makeRequest<T>(
      endpoint, 
      { 
        method: 'PUT', 
        body: data ? JSON.stringify(data) : undefined 
      }, 
      options
    )
  }

  /**
   * DELETE запрос
   */
  protected async delete<T>(endpoint: string, options: PyrusRequestOptions = {}): Promise<T | null> {
    return this.makeRequest<T>(endpoint, { method: 'DELETE' }, options)
  }

  /**
   * Проверка доступности API
   */
  async healthCheck(): Promise<boolean> {
    try {
      const token = await this.getToken()
      return token !== null
    } catch (error) {
      console.error('PyrusBaseClient: проверка доступности API не пройдена', error)
      return false
    }
  }
}
