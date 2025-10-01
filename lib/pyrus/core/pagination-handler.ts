/**
 * Keyset пагинация для форм Pyrus API v4
 * 
 * Реализация по официальной документации Pyrus API:
 * https://pyrus.com/en/help/api
 * 
 * Использует keyset pagination через параметры:
 * - `task_id<{last_task_id}` - фильтр задач с ID меньше указанного
 * - `sort=id` - сортировка по ID (по убыванию)
 * - `item_count` - количество задач на страницу (до 20000)
 * 
 * Остановка: когда вернулось задач меньше, чем запрошено в item_count.
 * 
 * Лимиты:
 * - До 20000 задач за один запрос
 * - До 5000 запросов за 10 минут
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
  // Примечание: Pyrus API не возвращает метаданные пагинации
  // Используется keyset pagination через ID задач
}

export class PyrusPaginationHandler {
  private client: PyrusBaseClient

  constructor(client: PyrusBaseClient) {
    this.client = client
  }

  /**
   * Итератор по задачам формы с KEYSET пагинацией
   * Реализация по официальной документации Pyrus API v4
   * https://pyrus.com/en/help/api
   */
  async *iterateAllTasks(
    formId: number,
    options: PaginationOptions = {}
  ): AsyncGenerator<PyrusTask, void, unknown> {
    const {
      includeArchived = false,
      maxTasks = Infinity,
      batchSize = 200, // Можно до 20000, но начнём с 200
      logProgress = true
    } = options

    let processedTasks = 0
    let pageNumber = 0
    let lastTaskId: number | null = null // ID последней задачи для keyset пагинации
    
    // Отслеживание обработанных ID для защиты от дубликатов
    const seenTaskIds = new Set<number>()

    if (logProgress) {
      console.log(`📄 PyrusPaginationHandler: начинаем keyset пагинацию формы ${formId}`)
      pyrusDebugLogger.incrementGlobal(`form_${formId}_iterations_started`)
    }

    // Цикл по страницам
    while (processedTasks < maxTasks) {
      pageNumber++
      
      try {
        // Формируем базовые параметры запроса
        const params = new URLSearchParams({
          item_count: Math.min(batchSize, maxTasks - processedTasks).toString(),
          include_archived: includeArchived ? 'y' : 'n',
          sort: 'id' // Сортировка по ID (по убыванию)
        })

        // Формируем endpoint с keyset фильтром
        // Примечание: символ < нужно URL-encode в %3C
        let endpoint = `forms/${formId}/register?${params.toString()}`
        
        if (lastTaskId !== null) {
          endpoint += `&task_id%3C${lastTaskId}` // task_id< (< закодирован как %3C)
        }
        
        if (logProgress) {
          const idFilter = lastTaskId !== null ? ` (id < ${lastTaskId})` : ' (без фильтра)'
          console.log(`📄 Страница ${pageNumber}${idFilter}`)
        }
        
        // Выполняем запрос с увеличенным timeout (60 сек для больших страниц)
        const response = await this.client.get<PyrusTasksResponse>(endpoint, {
          timeout: 60000
        })

        if (!response) {
          console.error(`❌ PyrusPaginationHandler: не удалось получить данные для формы ${formId}`)
          break
        }

        const { tasks = [] } = response
        const tasksReceived = tasks.length

        if (logProgress) {
          console.log(`  ✅ Получено ${tasksReceived} задач`)
        }

        // КРИТИЧЕСКАЯ ПРОВЕРКА: если задач нет, останавливаемся
        if (tasksReceived === 0) {
          if (logProgress) {
            console.log(`🏁 PyrusPaginationHandler: получен пустой ответ, завершаем`)
          }
          break
        }

        // Запоминаем ID последней задачи на странице для следующего запроса
        // КРИТИЧЕСКИ ВАЖНО: обновляем ПЕРЕД циклом, используя последнюю задачу со страницы
        if (tasks.length > 0) {
          lastTaskId = tasks[tasks.length - 1].id
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

        // KEYSET ПАГИНАЦИЯ: останавливаемся, если получили меньше, чем запрашивали
        if (tasksReceived < batchSize) {
          if (logProgress) {
            console.log(`🏁 PyrusPaginationHandler: получено ${tasksReceived} < ${batchSize}, данные закончились`)
          }
          break
        }
        
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
      console.log(`\n🏁 PyrusPaginationHandler: keyset пагинация завершена`)
      console.log(`  📊 Всего страниц: ${pageNumber}`)
      console.log(`  📋 Всего обработано задач: ${processedTasks}`)
      console.log(`  🔍 Уникальных задач: ${seenTaskIds.size}`)
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
