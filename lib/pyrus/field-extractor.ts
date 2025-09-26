/**
 * Утилиты для извлечения данных из полей Pyrus
 * 
 * Основано на анализе реальной структуры данных из форм 2304918 и 792300
 */

export interface PyrusField {
  id: number
  type: string
  name?: string
  value?: any
  parent_id?: number
  fields?: PyrusField[]
}

/**
 * Рекурсивное извлечение значения поля по ID
 * Работает с вложенными секциями и сложными структурами
 */
export function getFieldValue(fieldList: PyrusField[], fieldId: number): any {
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
        const nestedValue = getFieldValue(value.fields, fieldId)
        if (nestedValue !== null && nestedValue !== undefined) {
          return nestedValue
        }
      }

      // Поиск в массиве items (для таблиц и списков)
      if (Array.isArray(value.items)) {
        for (const item of value.items) {
          if (Array.isArray(item.fields)) {
            const nestedValue = getFieldValue(item.fields, fieldId)
            if (nestedValue !== null && nestedValue !== undefined) {
              return nestedValue
            }
          }
        }
      }
    }

    // Поиск в массиве fields на уровне поля (альтернативная структура)
    if (Array.isArray(field.fields)) {
      const nestedValue = getFieldValue(field.fields, fieldId)
      if (nestedValue !== null && nestedValue !== undefined) {
        return nestedValue
      }
    }
  }

  return null
}

/**
 * Извлечение текстового значения из поля
 * Обрабатывает различные типы полей: text, catalog, choice, etc.
 */
export function extractTextValue(fieldValue: any): string | null {
  if (!fieldValue) {
    return null
  }
  
  // Простое строковое значение
  if (typeof fieldValue === 'string') {
    return fieldValue
  }
  
  // Числовое значение
  if (typeof fieldValue === 'number') {
    return fieldValue.toString()
  }
  
  if (typeof fieldValue === 'object') {
    // Поля справочника (catalog) - используем values[0] или text
    if (Array.isArray(fieldValue.values) && fieldValue.values.length > 0) {
      return fieldValue.values[0]
    }
    
    // Поля выбора (multiple_choice) - используем choice_names[0]
    if (Array.isArray(fieldValue.choice_names) && fieldValue.choice_names.length > 0) {
      return fieldValue.choice_names[0]
    }
    
    // Текстовые поля и другие типы
    return fieldValue.text || fieldValue.value || fieldValue.name || null
  }
  
  return null
}

/**
 * Проверка статуса чекбокса
 * Возвращает true если чекбокс отмечен
 */
export function isCheckboxChecked(fieldValue: any): boolean {
  if (!fieldValue) {
    return false
  }
  
  // Булево значение
  if (typeof fieldValue === 'boolean') {
    return fieldValue
  }
  
  // Строковое значение
  if (typeof fieldValue === 'string') {
    return ['checked', 'да', 'yes', 'true'].includes(fieldValue.toLowerCase())
  }
  
  // Объект с полем checkmark
  if (typeof fieldValue === 'object' && fieldValue.checkmark) {
    return fieldValue.checkmark === 'checked'
  }
  
  return false
}

/**
 * Извлечение ФИО из поля person
 * Обрабатывает сложную структуру с first_name, last_name, etc.
 */
export function extractPersonName(fieldValue: any): string {
  if (!fieldValue) {
    return "Неизвестный преподаватель"
  }
  
  if (typeof fieldValue === 'string') {
    return fieldValue.trim()
  }
  
  if (typeof fieldValue === 'object') {
    // Поле person с first_name и last_name
    if (fieldValue.first_name || fieldValue.last_name) {
      const firstName = (fieldValue.first_name || '').toString().trim()
      const lastName = (fieldValue.last_name || '').toString().trim()
      const fullName = `${firstName} ${lastName}`.trim()
      if (fullName && fullName !== '') {
        return fullName
      }
    }
    
    // Другие варианты имени
    const possibleFields = ['text', 'name', 'value', 'display_name', 'full_name']
    for (const fieldName of possibleFields) {
      const nameValue = fieldValue[fieldName]
      if (typeof nameValue === 'string' && nameValue.trim()) {
        return nameValue.trim()
      }
    }
  }
  
  return "Неизвестный преподаватель"
}

/**
 * Извлечение названия филиала из поля catalog
 * Обрабатывает структуру справочника филиалов
 */
export function extractBranchName(fieldValue: any): string {
  if (!fieldValue) {
    return "Неизвестный филиал"
  }
  
  if (typeof fieldValue === 'string') {
    return fieldValue.trim()
  }
  
  if (typeof fieldValue === 'object') {
    // Поля справочника - используем values[0]
    if (Array.isArray(fieldValue.values) && fieldValue.values.length > 0) {
      return fieldValue.values[0]
    }
    
    // Альтернативный формат - rows[0][0]
    if (Array.isArray(fieldValue.rows) && 
        fieldValue.rows.length > 0 && 
        Array.isArray(fieldValue.rows[0]) && 
        fieldValue.rows[0].length > 0) {
      return fieldValue.rows[0][0]
    }
    
    // Текстовые варианты
    return fieldValue.text || fieldValue.name || fieldValue.value || "Неизвестный филиал"
  }
  
  return "Неизвестный филиал"
}

/**
 * Проверка статуса "учится" с учетом различных форматов
 * Специальная функция для полей типа "УЧИТСЯ"
 */
export function isStudying(taskFields: PyrusField[], fieldId: number): boolean {
  const fieldValue = getFieldValue(taskFields, fieldId)
  return isCheckboxChecked(fieldValue)
}

/**
 * Извлечение преподавателя из задачи
 */
export function extractTeacher(taskFields: PyrusField[], fieldId: number): string {
  const fieldValue = getFieldValue(taskFields, fieldId)
  return extractPersonName(fieldValue)
}

/**
 * Извлечение филиала из задачи
 */
export function extractBranch(taskFields: PyrusField[], fieldId: number): string {
  const fieldValue = getFieldValue(taskFields, fieldId)
  return extractBranchName(fieldValue)
}
