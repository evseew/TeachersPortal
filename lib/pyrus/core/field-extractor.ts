/**
 * Универсальный экстрактор полей из форм Pyrus
 * Основан на проверенной логике из final_fixed_report.md
 */

import { PyrusField } from '../forms-client'
import { pyrusDebugLogger } from './debug-logger'

export class PyrusFieldExtractor {
  
  /**
   * Рекурсивный поиск значения поля по ID
   * ТОЧНАЯ КОПИЯ логики из Python _get_field_value
   */
  getFieldValue(fieldList: PyrusField[], fieldId: number): any {
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
   * Извлечение ФИО преподавателя из поля справочника
   * ТОЧНАЯ КОПИЯ логики из Python _extract_teacher_name
   */
  extractTeacherName(taskFields: PyrusField[], fieldId: number): string {
    const value = this.getFieldValue(taskFields, fieldId)
    
    if (!value) {
      return "Неизвестный преподаватель"
    }

    // Строковое значение
    if (typeof value === 'string' && value.trim()) {
      return value.trim()
    }

    // Обработка объекта с данными преподавателя
    if (typeof value === 'object') {
      // Поддержка person-объекта: first_name/last_name (основной формат)
      if (value.first_name || value.last_name) {
        const firstName = (value.first_name || '').toString().trim()
        const lastName = (value.last_name || '').toString().trim()
        const fullName = `${firstName} ${lastName}`.trim()
        if (fullName && fullName !== '') {
          return fullName
        }
      }
      
      // Для справочника сотрудников обычно есть поле text или name
      const possibleFields = ['text', 'name', 'value', 'display_name', 'full_name']
      for (const fieldName of possibleFields) {
        const nameValue = value[fieldName]
        if (typeof nameValue === 'string' && nameValue.trim()) {
          return nameValue.trim()
        }
      }
    }
    
    return "Неизвестный преподаватель"
  }

  /**
   * Извлечение названия филиала из поля справочника
   * ТОЧНАЯ КОПИЯ логики из Python _extract_branch_name
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

    // Нормализация названия филиала (как в Python)
    return this.normalizeBranchName(branchName)
  }

  /**
   * Проверка валидности статуса PE
   * ТОЧНАЯ КОПИЯ логики из Python _is_valid_pe_status
   */
  isValidPEStatus(taskFields: PyrusField[], fieldId: number): boolean {
    const value = this.getFieldValue(taskFields, fieldId)
    
    // Допустимые статусы PE (как в Python)
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
   * Проверка отметки "учится"
   * ТОЧНАЯ КОПИЯ логики из Python _is_studying
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
    
    // Строковое значение (checked/unchecked)
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
   * Нормализация названия филиала
   * ТОЧНАЯ КОПИЯ логики из Python _normalize_branch_name
   */
  private normalizeBranchName(branchName: string): string {
    const normalized = branchName.toLowerCase().trim()
    
    // Только филиал Коммунистический 22 считается как Копейск
    if (normalized.includes('коммунистический') && normalized.includes('22')) {
      return 'Копейск'
    }
    // Славы 30 больше НЕ объединяется с Копейском
    
    // Возвращаем оригинальное название с заглавной буквы
    return this.toTitleCase(branchName.trim())
  }

  /**
   * Проверка исключения филиала из соревнования
   * ТОЧНАЯ КОПИЯ логики из Python _is_branch_excluded_from_competition
   */
  isBranchExcludedFromCompetition(branchName: string): boolean {
    const normalized = branchName.toLowerCase().trim()
    
    // Исключаем из соревнования филиалов (но НЕ из статистики преподавателей!)
    if (normalized.includes('макеева') && normalized.includes('15')) {
      return true
    }
    if (normalized.includes('коммуны') && normalized.includes('106/1')) {
      return true
    }
    if (normalized.includes('славы') && normalized.includes('30')) {
      return true
    }
    if (normalized.includes('online') || normalized === 'online') {
      return true
    }
    
    return false
  }

  /**
   * Преобразование в Title Case
   */
  private toTitleCase(str: string): string {
    return str.split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ')
  }
}

// Глобальный экземпляр для использования во всех Pyrus-интеграциях
export const pyrusFieldExtractor = new PyrusFieldExtractor()
