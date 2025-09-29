/**
 * Фабрика для создания клиентов Pyrus API
 * 
 * Централизованное создание и управление экземплярами клиентов
 * с возможностью кэширования и настройки
 */

import { PyrusFormsClient } from './forms-client'
import { PyrusTeachersClient } from './teachers-client'
import { PyrusTeachersClientV2 } from './teachers-client-v2'
import { PyrusUsersClient } from './client' // Существующий клиент

export interface ClientFactoryOptions {
  enableCaching?: boolean
  defaultTimeout?: number
  defaultRetries?: number
}

export class PyrusClientFactory {
  private static formsClientInstance: PyrusFormsClient | null = null
  private static teachersClientInstance: PyrusTeachersClient | null = null
  private static teachersClientV2Instance: PyrusTeachersClientV2 | null = null
  private static usersClientInstance: PyrusUsersClient | null = null
  
  private static options: ClientFactoryOptions = {
    enableCaching: true,
    defaultTimeout: 30000,
    defaultRetries: 3
  }

  /**
   * Настройка глобальных опций фабрики
   */
  static configure(options: Partial<ClientFactoryOptions>): void {
    this.options = { ...this.options, ...options }
  }

  /**
   * Создает или возвращает кэшированный экземпляр клиента форм
   */
  static createFormsClient(): PyrusFormsClient {
    if (this.options.enableCaching && this.formsClientInstance) {
      return this.formsClientInstance
    }

    const client = new PyrusFormsClient()
    
    if (this.options.enableCaching) {
      this.formsClientInstance = client
    }

    return client
  }

  /**
   * Создает или возвращает кэшированный экземпляр клиента преподавателей V2
   * РЕКОМЕНДУЕТСЯ для новых интеграций
   */
  static createTeachersClientV2(): PyrusTeachersClientV2 {
    if (this.options.enableCaching && this.teachersClientV2Instance) {
      return this.teachersClientV2Instance
    }

    const client = new PyrusTeachersClientV2()
    
    if (this.options.enableCaching) {
      this.teachersClientV2Instance = client
    }

    return client
  }

  /**
   * Создает или возвращает кэшированный экземпляр клиента преподавателей (старая версия)
   * УСТАРЕЛО: используйте createTeachersClientV2()
   */
  static createTeachersClient(): PyrusTeachersClient {
    if (this.options.enableCaching && this.teachersClientInstance) {
      return this.teachersClientInstance
    }

    const client = new PyrusTeachersClient()
    
    if (this.options.enableCaching) {
      this.teachersClientInstance = client
    }

    return client
  }

  /**
   * Создает или возвращает кэшированный экземпляр клиента пользователей
   */
  static createUsersClient(): PyrusUsersClient {
    if (this.options.enableCaching && this.usersClientInstance) {
      return this.usersClientInstance
    }

    const client = new PyrusUsersClient()
    
    if (this.options.enableCaching) {
      this.usersClientInstance = client
    }

    return client
  }

  /**
   * Создает набор всех клиентов для комплексной работы
   */
  static createAllClients(): {
    formsClient: PyrusFormsClient
    teachersClient: PyrusTeachersClient
    usersClient: PyrusUsersClient
  } {
    return {
      formsClient: this.createFormsClient(),
      teachersClient: this.createTeachersClient(),
      usersClient: this.createUsersClient()
    }
  }

  /**
   * Проверяет доступность всех клиентов
   */
  static async healthCheckAll(): Promise<{
    formsClient: boolean
    teachersClient: boolean
    usersClient: boolean
    allHealthy: boolean
  }> {
    const clients = this.createAllClients()

    const [formsHealth, teachersHealth, usersHealth] = await Promise.allSettled([
      clients.formsClient.healthCheck(),
      clients.teachersClient.healthCheck(),
      clients.usersClient.getMembers().then(members => members.length >= 0) // Простая проверка
    ])

    const formsClientHealthy = formsHealth.status === 'fulfilled' && formsHealth.value === true
    const teachersClientHealthy = teachersHealth.status === 'fulfilled' && teachersHealth.value === true
    const usersClientHealthy = usersHealth.status === 'fulfilled' && usersHealth.value === true

    const result = {
      formsClient: formsClientHealthy,
      teachersClient: teachersClientHealthy,
      usersClient: usersClientHealthy,
      allHealthy: formsClientHealthy && teachersClientHealthy && usersClientHealthy
    }

    console.log('PyrusClientFactory: результаты проверки здоровья клиентов:', result)
    
    return result
  }

  /**
   * Очищает кэш всех клиентов
   */
  static clearCache(): void {
    this.formsClientInstance = null
    this.teachersClientInstance = null
    this.usersClientInstance = null
    console.log('PyrusClientFactory: кэш клиентов очищен')
  }

  /**
   * Получает информацию о состоянии фабрики
   */
  static getFactoryInfo(): {
    cachingEnabled: boolean
    cachedClients: {
      forms: boolean
      teachers: boolean
      users: boolean
    }
    options: ClientFactoryOptions
  } {
    return {
      cachingEnabled: this.options.enableCaching || false,
      cachedClients: {
        forms: this.formsClientInstance !== null,
        teachers: this.teachersClientInstance !== null,
        users: this.usersClientInstance !== null
      },
      options: { ...this.options }
    }
  }

  /**
   * Создает клиент с кастомными настройками (без кэширования)
   */
  static createCustomFormsClient(options: {
    timeout?: number
    retries?: number
  }): PyrusFormsClient {
    const client = new PyrusFormsClient()
    // Здесь можно было бы настроить кастомные опции, если базовый клиент их поддерживает
    return client
  }

  /**
   * Создает клиент преподавателей с кастомными настройками (без кэширования)
   */
  static createCustomTeachersClient(options: {
    timeout?: number
    retries?: number
  }): PyrusTeachersClient {
    const client = new PyrusTeachersClient()
    // Здесь можно было бы настроить кастомные опции, если базовый клиент их поддерживает
    return client
  }

  /**
   * Утилита для тестирования подключения к Pyrus API
   */
  static async testConnection(): Promise<{
    success: boolean
    error?: string
    details: {
      canAuthenticate: boolean
      canAccessForms: boolean
      canAccessUsers: boolean
    }
  }> {
    try {
      const clients = this.createAllClients()
      
      // Тестируем аутентификацию через любой клиент
      const formsHealthy = await clients.formsClient.healthCheck()
      
      // Тестируем доступ к пользователям
      let usersHealthy = false
      try {
        const members = await clients.usersClient.getMembers()
        usersHealthy = Array.isArray(members)
      } catch (error) {
        console.warn('PyrusClientFactory: ошибка доступа к пользователям:', error)
      }

      // Тестируем доступ к формам (пробуем получить несуществующую форму)
      let formsAccessible = false
      try {
        await clients.formsClient.formExists(999999) // Несуществующая форма
        formsAccessible = true // Если не упало с ошибкой авторизации, значит доступ есть
      } catch (error) {
        console.warn('PyrusClientFactory: ошибка доступа к формам:', error)
      }

      const details = {
        canAuthenticate: formsHealthy,
        canAccessForms: formsAccessible,
        canAccessUsers: usersHealthy
      }

      const success = formsHealthy && (formsAccessible || usersHealthy)

      return {
        success,
        details,
        ...(success ? {} : { error: 'Не удалось подключиться к Pyrus API' })
      }

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Неизвестная ошибка',
        details: {
          canAuthenticate: false,
          canAccessForms: false,
          canAccessUsers: false
        }
      }
    }
  }
}
