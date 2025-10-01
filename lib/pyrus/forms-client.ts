/**
 * Клиент для работы с формами Pyrus API v4
 * 
 * Использует keyset пагинацию по официальной документации Pyrus API:
 * https://pyrus.com/en/help/api
 * 
 * Keyset pagination через параметры:
 * - task_id<{last_id} - фильтрация задач с ID меньше указанного
 * - sort=id - сортировка по ID (по убыванию)
 */

import { PyrusBaseClient, PyrusRequestOptions } from './base-client'
import { PyrusPaginationHandler, PaginationOptions } from './core/pagination-handler'
import { PyrusFieldExtractor, pyrusFieldExtractor } from './core/field-extractor'

export interface PyrusTask {
  id: number
  subject: string
  status: string
  create_date: string
  due_date?: string
  fields?: PyrusField[]
  [key: string]: any
}

export interface PyrusField {
  id: number
  type: string
  value?: any
  [key: string]: any
}

// Примечание: PyrusTasksResponse определен в pagination-handler.ts
// Pyrus API не возвращает метаданные пагинации, используется keyset pagination через ID

export interface FormsIteratorOptions {
  includeArchived?: boolean
  maxTasks?: number
  batchSize?: number
  requestOptions?: PyrusRequestOptions
}

export class PyrusFormsClient extends PyrusBaseClient {
  private paginationHandler: PyrusPaginationHandler
  private fieldExtractor: PyrusFieldExtractor

  constructor() {
    super()
    this.paginationHandler = new PyrusPaginationHandler(this)
    this.fieldExtractor = pyrusFieldExtractor
  }
  
  /**
   * Итератор по задачам формы с keyset пагинацией
   * 
   * Использует keyset pagination через параметры:
   * - task_id<{last_id} - фильтрация задач с ID меньше указанного
   * - sort=id - сортировка по ID (по убыванию)
   * 
   * @see https://pyrus.com/en/help/api
   */
  async *iterRegisterTasks(
    formId: number, 
    options: FormsIteratorOptions = {}
  ): AsyncGenerator<PyrusTask, void, unknown> {
    // Преобразуем опции к формату пагинатора
    const paginationOptions: PaginationOptions = {
      includeArchived: options.includeArchived,
      maxTasks: options.maxTasks,
      batchSize: options.batchSize,
      logProgress: true
    }

    // Используем keyset пагинатор
    for await (const task of this.paginationHandler.iterateAllTasks(formId, paginationOptions)) {
      yield task
    }
  }

  /**
   * НОВЫЙ: Получение значения поля через надежный экстрактор
   * Использует проверенную логику из Python
   */
  getFieldValue(fieldList: PyrusField[], fieldId: number): any {
    return this.fieldExtractor.getFieldValue(fieldList, fieldId)
  }

  /**
   * Получение всех задач формы (для небольших форм)
   */
  async getAllTasks(
    formId: number, 
    options: FormsIteratorOptions = {}
  ): Promise<PyrusTask[]> {
    const tasks: PyrusTask[] = []
    
    try {
      for await (const task of this.iterRegisterTasks(formId, options)) {
        tasks.push(task)
      }
    } catch (error) {
      console.error(`PyrusFormsClient: ошибка при получении всех задач формы ${formId}:`, error)
    }

    return tasks
  }

  /**
   * НОВЫЙ: Получение статистики через надежный пагинатор
   */
  async getFormStats(formId: number): Promise<{
    totalTasks: number
    archivedTasks: number
    activeTasks: number
  } | null> {
    return await this.paginationHandler.getFormStats(formId)
  }

  /**
   * НОВЫЙ: Проверка существования формы через пагинатор
   */
  async formExists(formId: number): Promise<boolean> {
    return await this.paginationHandler.formExists(formId)
  }
}
