#!/usr/bin/env node
/**
 * Тест новых функций извлечения полей на реальных данных
 */

const fs = require('fs')
const path = require('path')

// Функции извлечения полей (портированные из TypeScript)
function getFieldValue(fieldList, fieldId) {
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

function extractTextValue(fieldValue) {
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

function isCheckboxChecked(fieldValue) {
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

function extractPersonName(fieldValue) {
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

function extractBranchName(fieldValue) {
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

// Загружаем реальные данные из JSON файлов
function loadTaskData(formId) {
  const files = {
    2304918: 'debug-form-2304918-task-302953976.json',
    792300: 'debug-form-792300-task-307785818.json'
  }
  
  const filename = files[formId]
  if (!filename) {
    throw new Error(`Неизвестная форма: ${formId}`)
  }
  
  try {
    const filePath = path.join(__dirname, filename)
    const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'))
    return data
  } catch (error) {
    console.error(`❌ Не удалось загрузить файл ${filename}:`, error.message)
    return null
  }
}

function testForm2304918() {
  console.log('\n' + '='.repeat(60))
  console.log('🧪 ТЕСТ ФОРМЫ 2304918 (старички)')
  console.log('='.repeat(60))
  
  const taskData = loadTaskData(2304918)
  if (!taskData) return
  
  const fields = taskData.fields
  console.log(`📊 Загружено полей: ${fields.length}`)
  
  // Тестируем важные поля
  const fieldTests = {
    8: 'Преподаватель',
    5: 'Филиал', 
    64: 'УЧИТСЯ (заполняет СО)',
    7: 'Статус PE',
    27: 'Пришел на первое занятие?',
    25: 'Статус выхода'
  }
  
  console.log('\n🔍 ТЕСТ ИЗВЛЕЧЕНИЯ ПОЛЕЙ:')
  for (const [fieldId, fieldName] of Object.entries(fieldTests)) {
    const id = parseInt(fieldId, 10)
    const rawValue = getFieldValue(fields, id)
    const textValue = extractTextValue(rawValue)
    const isChecked = isCheckboxChecked(rawValue)
    
    console.log(`\n  ID:${id.toString().padStart(2)} ${fieldName}`)
    console.log(`    Raw: ${JSON.stringify(rawValue)}`)
    console.log(`    Text: "${textValue}"`)
    console.log(`    Checked: ${isChecked}`)
    
    // Специальные тесты
    if (id === 8) { // Преподаватель
      const teacherName = extractPersonName(rawValue)
      console.log(`    Person: "${teacherName}"`)
    }
    
    if (id === 5) { // Филиал
      const branchName = extractBranchName(rawValue)
      console.log(`    Branch: "${branchName}"`)
    }
  }
}

function testForm792300() {
  console.log('\n' + '='.repeat(60))
  console.log('🧪 ТЕСТ ФОРМЫ 792300 (новый клиент)')
  console.log('='.repeat(60))
  
  const taskData = loadTaskData(792300)
  if (!taskData) return
  
  const fields = taskData.fields
  console.log(`📊 Загружено полей: ${fields.length}`)
  
  // Тестируем важные поля
  const fieldTests = {
    142: 'Преподаватель',
    226: 'Филиал',
    187: 'УЧИТСЯ',
    228: 'Статус PE',
    183: 'Пришел на 1-е занятие?',
    198: 'Пришел на 2-е занятие?'
  }
  
  console.log('\n🔍 ТЕСТ ИЗВЛЕЧЕНИЯ ПОЛЕЙ:')
  for (const [fieldId, fieldName] of Object.entries(fieldTests)) {
    const id = parseInt(fieldId, 10)
    const rawValue = getFieldValue(fields, id)
    const textValue = extractTextValue(rawValue)
    const isChecked = isCheckboxChecked(rawValue)
    
    console.log(`\n  ID:${id.toString().padStart(3)} ${fieldName}`)
    console.log(`    Raw: ${JSON.stringify(rawValue)}`)
    console.log(`    Text: "${textValue}"`)
    console.log(`    Checked: ${isChecked}`)
    
    // Специальные тесты
    if (id === 142) { // Преподаватель
      const teacherName = extractPersonName(rawValue)
      console.log(`    Person: "${teacherName}"`)
    }
    
    if (id === 226) { // Филиал
      const branchName = extractBranchName(rawValue)
      console.log(`    Branch: "${branchName}"`)
    }
  }
}

function main() {
  console.log('🧪 ТЕСТИРОВАНИЕ ФУНКЦИЙ ИЗВЛЕЧЕНИЯ ПОЛЕЙ PYRUS')
  
  try {
    testForm2304918()
    testForm792300()
    
    console.log('\n✅ Все тесты завершены!')
    
  } catch (error) {
    console.error('❌ Ошибка тестирования:', error.message)
  }
}

main()
