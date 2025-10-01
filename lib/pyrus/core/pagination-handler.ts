/**
 * Курсорная пагинация для форм Pyrus API v4
 * 
 * Реализация по официальной документации Pyrus API:
 * @see PYRUS_API_INTEGRATION_GUIDE.md
 * 
 * Использует параметр `cursor` и поле `next_cursor` для надежной пагинации.
 * Гарантирует отсутствие дубликатов и потери данных при больших объемах.
 */

import { PyrusBaseClient } from '../base-client'
import { PyrusTask } from '../forms-client'
import { pyrusDebugLogger } from './debug-logger'

export interface PaginationOptions {
  includeArchived?: boolean
  maxTasks?: number
  batchSize?: number
  logProgress?: boolean
}

interface PyrusTasksResponse {
  tasks: PyrusTask[]
  next_cursor?: string  // Курсор для следующей страницы (официальный API v4)
}

export class PyrusPaginationHandler {
  private client: PyrusBaseClient

  constructor(client: PyrusBaseClient) {
    this.client = client
  }

  /**
   * Итератор по задачам формы с КУРСОРНОЙ пагинацией
   * Реализация по официальной документации Pyrus API v4
   * @see PYRUS_API_INTEGRATION_GUIDE.md
   */
  async *iterateAllTasks(
    formId: number,
    options: PaginationOptions = {}
  ): AsyncGenerator<PyrusTask, void, unknown> {
    const {
      includeArchived = false,
      maxTasks = Infinity,
      batchSize = 200, // По умолчанию в Pyrus API
      logProgress = true
    } = options

    let processedTasks = 0
    let pageNumber = 0
    let cursor: string | null = null // Курсор для следующей страницы
    
    // Отслеживание обработанных ID для защиты от дубликатов
    const seenTaskIds = new Set<number>()

    if (logProgress) {
      console.log(`📄 PyrusPaginationHandler: начинаем курсорную пагинацию формы ${formId}`)
      pyrusDebugLogger.incrementGlobal(`form_${formId}_iterations_started`)
    }

    // Цикл по страницам
    while (processedTasks < maxTasks) {
      pageNumber++
      
      try {
        // Формируем параметры запроса по документации Pyrus API v4
        const params = new URLSearchParams({
          item_count: Math.min(batchSize, maxTasks - processedTasks).toString(),
          include_archived: includeArchived ? 'y' : 'n'
        })

        // Добавляем курсор, если это не первая страница
        if (cursor) {
          params.append('cursor', cursor)
        }

        const endpoint = `forms/${formId}/register?${params.toString()}`
        
        if (logProgress) {
          console.log(`📄 Страница ${pageNumber}: запрос к ${endpoint.substring(0, 100)}${cursor ? '...' : ''}`)
        }
        
        // Выполняем запрос с увеличенным timeout (60 сек для больших страниц)
        const response = await this.client.get<PyrusTasksResponse>(endpoint, {
          timeout: 60000
        })

        if (!response) {
          console.error(`❌ PyrusPaginationHandler: не удалось получить данные для формы ${formId}`)
          break
        }

        const { tasks = [], next_cursor } = response
        const tasksReceived = tasks.length

        if (logProgress) {
          console.log(`  ✅ Получено ${tasksReceived} задач, next_cursor: ${next_cursor ? 'есть' : 'нет'}`)
        }

        // КРИТИЧЕСКАЯ ПРОВЕРКА: если задач нет, останавливаемся
        if (tasksReceived === 0) {
          if (logProgress) {
            console.log(`🏁 PyrusPaginationHandler: получен пустой ответ, завершаем`)
          }
          break
        }

        // Отдаем задачи по одной
        for (const task of tasks) {
          if (processedTasks >= maxTasks) {
            break
          }
          
          // Проверка на дубликат
          if (seenTaskIds.has(task.id)) {
            if (logProgress) {
              console.warn(`⚠️  PyrusPaginationHandler: пропуск дубликата task_id=${task.id}`)
            }
            pyrusDebugLogger.incrementGlobal(`form_${formId}_duplicates_skipped`)
            continue
          }
          
          seenTaskIds.add(task.id)
          yield task
          processedTasks++
          
          pyrusDebugLogger.incrementGlobal(`form_${formId}_tasks_yielded`)
        }

        // КУРСОРНАЯ ПАГИНАЦИЯ: проверяем наличие next_cursor
        if (!next_cursor) {
          // Курсора нет - это была последняя страница
          if (logProgress) {
            console.log(`🏁 PyrusPaginationHandler: next_cursor отсутствует, данные закончились`)
          }
          break
        }
        
        // Устанавливаем курсор для следующей страницы
        cursor = next_cursor
        
        // Проверяем лимит обработанных задач
        if (processedTasks >= maxTasks) {
          if (logProgress) {
            console.log(`🏁 PyrusPaginationHandler: достигнут лимит maxTasks=${maxTasks}, завершаем`)
          }
          break
        }

        // Логирование прогресса каждые 500 задач
        if (logProgress && processedTasks % 500 === 0) {
          console.log(`📊 PyrusPaginationHandler: обработано ${processedTasks} задач формы ${formId}`)
        }

        // Небольшая задержка между запросами (защита от rate limiting)
        await new Promise(resolve => setTimeout(resolve, 100))

      } catch (error) {
        console.error(`❌ PyrusPaginationHandler: ошибка на странице ${pageNumber} формы ${formId}:`, error)
        pyrusDebugLogger.incrementGlobal(`form_${formId}_pagination_errors`)
        
        // При ошибке пытаемся продолжить после задержки
        await new Promise(resolve => setTimeout(resolve, 5000))
        continue
      }
    }

    if (logProgress) {
      console.log(`\n🏁 PyrusPaginationHandler: курсорная пагинация завершена`)
      console.log(`  📊 Всего страниц: ${pageNumber}`)
      console.log(`  📋 Всего обработано задач: ${processedTasks}`)
      console.log(`  🔍 Дубликатов пропущено: ${seenTaskIds.size - processedTasks}`)
      pyrusDebugLogger.incrementGlobal(`form_${formId}_total_processed`, processedTasks)
    }
  }

  /**
   * Получение статистики по форме
   */
  async getFormStats(formId: number): Promise<{
    totalTasks: number
    archivedTasks: number
    activeTasks: number
  } | null> {
    try {
      console.log(`PyrusPaginationHandler: получение статистики для формы ${formId}`)
      
      let totalTasks = 0
      let archivedTasks = 0

      // Считаем все задачи включая архивные
      for await (const task of this.iterateAllTasks(formId, { 
        includeArchived: true,
        batchSize: 200,
        logProgress: false
      })) {
        totalTasks++
        
        // Проверяем статус задачи для определения архивных
        if (task.status && task.status.toLowerCase().includes('archive')) {
          archivedTasks++
        }
      }

      const activeTasks = totalTasks - archivedTasks

      console.log(`PyrusPaginationHandler: статистика формы ${formId} - всего: ${totalTasks}, активных: ${activeTasks}, архивных: ${archivedTasks}`)

      return {
        totalTasks,
        archivedTasks,
        activeTasks
      }

    } catch (error) {
      console.error(`PyrusPaginationHandler: ошибка получения статистики формы ${formId}:`, error)
      return null
    }
  }

  /**
   * Проверка существования формы
   */
  async formExists(formId: number): Promise<boolean> {
    try {
      const response = await this.client.get(`forms/${formId}`)
      return response !== null
    } catch (error) {
      console.error(`PyrusPaginationHandler: ошибка проверки существования формы ${formId}:`, error)
      return false
    }
  }
}
