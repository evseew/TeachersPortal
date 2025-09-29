/**
 * Правильная пагинация для форм Pyrus
 * Основана на проверенной логике из final_fixed_report.md
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
  has_more: boolean
  next_task_id?: number
}

export class PyrusPaginationHandler {
  private client: PyrusBaseClient

  constructor(client: PyrusBaseClient) {
    this.client = client
  }

  /**
   * Итератор по задачам формы с правильной пагинацией
   * ТОЧНАЯ КОПИЯ логики из Python iter_register_tasks
   */
  async *iterateAllTasks(
    formId: number,
    options: PaginationOptions = {}
  ): AsyncGenerator<PyrusTask, void, unknown> {
    const {
      includeArchived = false,
      maxTasks = Infinity,
      batchSize = 200, // Как в Python
      logProgress = true
    } = options

    let processedTasks = 0
    let nextTaskId: number | undefined = undefined
    let hasMore = true

    if (logProgress) {
      console.log(`PyrusPaginationHandler: начинаем итерацию по форме ${formId}`)
      pyrusDebugLogger.incrementGlobal(`form_${formId}_iterations_started`)
    }

    while (hasMore && processedTasks < maxTasks) {
      try {
        // Строим параметры запроса ТОЧНО как в Python
        const params = new URLSearchParams({
          item_count: Math.min(batchSize, maxTasks - processedTasks).toString(),
          include_archived: includeArchived ? 'y' : 'n'
        })

        // КРИТИЧЕСКИ ВАЖНО: используем max_task_id для пагинации (как в Python)
        if (nextTaskId !== undefined) {
          params.append('max_task_id', nextTaskId.toString())
        }

        const endpoint = `forms/${formId}/register?${params.toString()}`
        
        if (logProgress) {
          console.log(`PyrusPaginationHandler: запрос к ${endpoint}`)
        }
        
        // Выполняем запрос с увеличенным timeout
        const response = await this.client.get<PyrusTasksResponse>(endpoint, {
          timeout: 60000
        })

        if (!response) {
          console.error(`PyrusPaginationHandler: не удалось получить данные для формы ${formId}`)
          break
        }

        const { tasks = [], has_more = false, next_task_id } = response

        if (logProgress) {
          console.log(`PyrusPaginationHandler: получено ${tasks.length} задач, has_more: ${has_more}, next_task_id: ${next_task_id}`)
        }

        // КРИТИЧЕСКАЯ ПРОВЕРКА: если задач нет, останавливаемся
        if (tasks.length === 0) {
          if (logProgress) {
            console.log(`PyrusPaginationHandler: получен пустой ответ для формы ${formId}`)
          }
          break
        }

        // Отдаем задачи по одной
        for (const task of tasks) {
          if (processedTasks >= maxTasks) {
            break
          }

          yield task
          processedTasks++
          
          pyrusDebugLogger.incrementGlobal(`form_${formId}_tasks_yielded`)
        }

        // ПРАВИЛЬНАЯ ЛОГИКА ПАГИНАЦИИ (как в Python):
        // Продолжаем только если:
        // 1. API предоставляет next_task_id 
        // 2. Получили полную пачку задач
        // 3. Не достигли лимита
        if (next_task_id !== undefined && next_task_id !== null) {
          nextTaskId = next_task_id
          hasMore = tasks.length === batchSize && processedTasks < maxTasks
          
          if (logProgress) {
            console.log(`PyrusPaginationHandler: продолжаем с next_task_id=${next_task_id}, hasMore=${hasMore}`)
          }
        } else {
          // Если API не предоставляет next_task_id, останавливаемся
          if (logProgress) {
            console.log(`PyrusPaginationHandler: API не предоставляет next_task_id, завершаем итерацию`)
          }
          hasMore = false
        }

        // Логирование прогресса каждые 500 задач
        if (logProgress && (processedTasks % 500 === 0 || !hasMore)) {
          console.log(`PyrusPaginationHandler: обработано ${processedTasks} задач формы ${formId}`)
        }

        // Небольшая задержка между запросами для снижения нагрузки на API
        if (hasMore) {
          await new Promise(resolve => setTimeout(resolve, 100))
        }

      } catch (error) {
        console.error(`PyrusPaginationHandler: ошибка при получении задач формы ${formId}:`, error)
        pyrusDebugLogger.incrementGlobal(`form_${formId}_pagination_errors`)
        
        // Пытаемся продолжить с задержкой
        await new Promise(resolve => setTimeout(resolve, 5000))
        continue
      }
    }

    if (logProgress) {
      console.log(`PyrusPaginationHandler: итерация завершена. Всего обработано ${processedTasks} задач формы ${formId}`)
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
