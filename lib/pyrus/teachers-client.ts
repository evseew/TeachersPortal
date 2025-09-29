/**
 * Клиент для работы с данными преподавателей из форм Pyrus
 * 
 * ОБНОВЛЕНО: Использует новую надежную архитектуру
 * Основана на проверенной логике из final_fixed_report.md
 */

import { PyrusBaseClient } from './base-client'
import { PyrusField } from './forms-client'
import { PyrusFieldExtractor, pyrusFieldExtractor } from './core/field-extractor'
import { pyrusDebugLogger } from './core/debug-logger'

export interface TeacherData {
  name: string
  branch: string
  isStudying: boolean
  isValidPEStatus: boolean
  taskId: number
}

export interface BranchData {
  name: string
  normalizedName: string
  isExcluded: boolean
}

export class PyrusTeachersClient extends PyrusBaseClient {
  private fieldExtractor: PyrusFieldExtractor

  constructor() {
    super()
    this.fieldExtractor = pyrusFieldExtractor
  }

  /**
   * НОВЫЙ: Извлечение ФИО преподавателя через надежный экстрактор
   * Использует проверенную логику из Python
   */
  extractTeacherName(taskFields: PyrusField[], fieldId: number): string {
    return this.fieldExtractor.extractTeacherName(taskFields, fieldId)
  }

  /**
   * Извлекает название филиала из поля справочника с нормализацией
   * Основано на логике из reference.md
   */
  extractBranchName(taskFields: PyrusField[], fieldId: number): string {
    const value = this.getFieldValue(taskFields, fieldId)
    
    if (!value) {
      return "Неизвестный филиал"
    }

    let branchName = ""

    // Обработка объекта справочника
    if (typeof value === 'object') {
      // Проверяем массив values - основной способ для справочника филиалов
      if (Array.isArray(value.values) && value.values.length > 0) {
        const firstValue = value.values[0]
        if (typeof firstValue === 'string' && firstValue.trim()) {
          branchName = firstValue.trim()
        }
      }
      
      // Проверяем rows если values не найден  
      else if (Array.isArray(value.rows) && value.rows.length > 0) {
        const firstRow = value.rows[0]
        if (Array.isArray(firstRow) && firstRow.length > 0) {
          const firstCell = firstRow[0]
          if (typeof firstCell === 'string' && firstCell.trim()) {
            branchName = firstCell.trim()
          }
        }
      }
      
      // Для обычных справочников проверяем стандартные поля
      else {
        const possibleFields = ['text', 'name', 'value', 'display_name']
        for (const fieldName of possibleFields) {
          const fieldValue = value[fieldName]
          if (typeof fieldValue === 'string' && fieldValue.trim()) {
            branchName = fieldValue.trim()
            break
          }
        }
      }
    }
    
    // Обработка строкового значения
    else if (typeof value === 'string' && value.trim()) {
      branchName = value.trim()
    }

    // Если не удалось извлечь название
    if (!branchName) {
      return "Неизвестный филиал"
    }

    // Нормализация названия филиала
    return this.normalizeBranchName(branchName)
  }

  /**
   * Проверяет отметку "учится" в указанном поле
   * Основано на логике из reference.md
   */
  isStudying(taskFields: PyrusField[], fieldId: number): boolean {
    const value = this.getFieldValue(taskFields, fieldId)
    
    if (value === null || value === undefined) {
      return false
    }
    
    // Булево значение
    if (typeof value === 'boolean') {
      return value
    }
    
    // Строковое значение
    if (typeof value === 'string') {
      const normalizedValue = value.toLowerCase().trim()
      return ['да', 'yes', 'true', 'checked', '1'].includes(normalizedValue)
    }
    
    // Объект с чекбоксом
    if (typeof value === 'object') {
      // Проверяем различные варианты представления чекбокса
      if (value.checkmark === 'checked' || value.checked === true) {
        return true
      }
      
      // Проверяем значение как булево
      if (typeof value.value === 'boolean') {
        return value.value
      }
    }
    
    return false
  }

  /**
   * Проверяет соответствие статуса PE допустимым значениям
   * Основано на логике из reference.md
   */
  isValidPEStatus(taskFields: PyrusField[], fieldId: number): boolean {
    const value = this.getFieldValue(taskFields, fieldId)
    
    // Допустимые статусы PE
    const validStatuses = new Set(['PE Start', 'PE Future', 'PE 5'])
    
    if (!value) {
      return false
    }

    let statusValue = ""

    // Обработка объекта справочника
    if (typeof value === 'object') {
      // Проверяем choice_names для справочника выбора
      if (Array.isArray(value.choice_names) && value.choice_names.length > 0) {
        const firstChoice = value.choice_names[0]
        if (typeof firstChoice === 'string') {
          statusValue = firstChoice.trim()
        }
      }
      
      // Проверяем массив values для справочника
      else if (Array.isArray(value.values) && value.values.length > 0) {
        const firstValue = value.values[0]
        if (typeof firstValue === 'string') {
          statusValue = firstValue.trim()
        }
      }
      
      // Проверяем rows если values не найден  
      else if (Array.isArray(value.rows) && value.rows.length > 0) {
        const firstRow = value.rows[0]
        if (Array.isArray(firstRow) && firstRow.length > 0) {
          const firstCell = firstRow[0]
          if (typeof firstCell === 'string') {
            statusValue = firstCell.trim()
          }
        }
      }
      
      // Для обычных справочников проверяем стандартные поля
      else {
        const possibleFields = ['text', 'name', 'value']
        for (const fieldName of possibleFields) {
          const fieldValue = value[fieldName]
          if (typeof fieldValue === 'string' && fieldValue.trim()) {
            statusValue = fieldValue.trim()
            break
          }
        }
      }
    }
    
    // Обработка строкового значения
    else if (typeof value === 'string') {
      statusValue = value.trim()
    }

    return validStatuses.has(statusValue)
  }

  /**
   * Извлекает полные данные преподавателя из задачи
   */
  extractTeacherData(
    taskFields: PyrusField[], 
    taskId: number,
    fieldMapping: {
      teacherFieldId: number
      branchFieldId: number
      studyingFieldId: number
      statusFieldId: number
    }
  ): TeacherData {
    const { teacherFieldId, branchFieldId, studyingFieldId, statusFieldId } = fieldMapping

    return {
      name: this.extractTeacherName(taskFields, teacherFieldId),
      branch: this.extractBranchName(taskFields, branchFieldId),
      isStudying: this.isStudying(taskFields, studyingFieldId),
      isValidPEStatus: this.isValidPEStatus(taskFields, statusFieldId),
      taskId
    }
  }

  /**
   * Нормализует название филиала для объединения данных
   * Основано на логике из reference.md
   */
  private normalizeBranchName(branchName: string): string {
    const normalized = branchName.toLowerCase().trim()
    
    // Исключаем закрытые филиалы
    if (normalized.includes('макеева') && normalized.includes('15')) {
      throw new Error('EXCLUDED_BRANCH') // Исключаем из отчета
    }
    if (normalized.includes('коммуны') && normalized.includes('106/1')) {
      throw new Error('EXCLUDED_BRANCH') // Исключаем из отчета
    }
    
    // Объединяем филиалы Копейска под единым названием
    if (normalized.includes('коммунистический') && normalized.includes('22')) {
      return 'Копейск'
    }
    if (normalized.includes('славы') && normalized.includes('30')) {
      return 'Копейск'
    }
    
    // Возвращаем нормализованное название с заглавной буквы
    return this.toTitleCase(branchName.trim())
  }

  /**
   * Преобразует строку в Title Case
   */
  private toTitleCase(str: string): string {
    return str.split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ')
  }

  /**
   * Получение значения поля по ID с рекурсивным поиском
   * ИСПРАВЛЕНО: правильная обработка структуры данных Pyrus
   */
  private getFieldValue(fieldList: PyrusField[], fieldId: number): any {
    if (!Array.isArray(fieldList)) {
      return null
    }

    for (const field of fieldList) {
      // Прямое совпадение по ID
      if (field.id === fieldId) {
        return field.value
      }

      // Рекурсивный поиск во вложенных структурах
      const value = field.value
      if (value && typeof value === 'object') {
        // Поиск в поле fields (основной способ для секций)
        if (Array.isArray(value.fields)) {
          const nestedValue = this.getFieldValue(value.fields, fieldId)
          if (nestedValue !== null && nestedValue !== undefined) {
            return nestedValue
          }
        }

        // Поиск в массиве items (для таблиц и списков)
        if (Array.isArray(value.items)) {
          for (const item of value.items) {
            if (Array.isArray(item.fields)) {
              const nestedValue = this.getFieldValue(item.fields, fieldId)
              if (nestedValue !== null && nestedValue !== undefined) {
                return nestedValue
              }
            }
          }
        }
      }

      // Поиск в массиве fields на уровне поля (альтернативная структура)
      if (Array.isArray(field.fields)) {
        const nestedValue = this.getFieldValue(field.fields, fieldId)
        if (nestedValue !== null && nestedValue !== undefined) {
          return nestedValue
        }
      }
    }

    return null
  }

  /**
   * Проверка статуса чекбокса "учится"
   * ДОБАВЛЕНО: обработка различных форматов чекбоксов Pyrus
   */
  isStudying(taskFields: PyrusField[], fieldId: number): boolean {
    const value = this.getFieldValue(taskFields, fieldId)
    
    if (!value) {
      return false
    }
    
    // Булево значение
    if (typeof value === 'boolean') {
      return value
    }
    
    // Строковое значение
    if (typeof value === 'string') {
      return ['checked', 'да', 'yes', 'true'].includes(value.toLowerCase())
    }
    
    // Объект с полем checkmark
    if (typeof value === 'object' && value.checkmark) {
      return value.checkmark === 'checked'
    }
    
    return false
  }

  /**
   * Валидация данных преподавателя
   */
  validateTeacherData(data: TeacherData): {
    isValid: boolean
    errors: string[]
  } {
    const errors: string[] = []

    if (!data.name || data.name === "Неизвестный преподаватель") {
      errors.push("Отсутствует имя преподавателя")
    }

    if (!data.branch || data.branch === "Неизвестный филиал") {
      errors.push("Отсутствует филиал")
    }

    if (!data.isValidPEStatus) {
      errors.push("Некорректный статус PE")
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  }
}
