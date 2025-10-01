#!/usr/bin/env ts-node
/**
 * Тестирование исправленной пагинации Pyrus
 * 
 * Проверяет:
 * - Получение всех задач из форм 2304918 и 792300
 * - Отсутствие дубликатов
 * - Корректность количества задач
 */

import { PyrusClientFactory } from '../lib/pyrus/client-factory'

async function testPaginationFix() {
  console.log('🧪 Тестирование исправленной пагинации Pyrus API\n')
  console.log('=' .repeat(70))
  
  try {
    const formsClient = PyrusClientFactory.createFormsClient()
    
    // Тест 1: Форма 2304918 (старички)
    console.log('\n📋 Тест 1: Форма 2304918 (старички)')
    console.log('-'.repeat(70))
    
    const seenIds2304918 = new Set<number>()
    let count2304918 = 0
    let duplicates2304918 = 0
    
    console.log('⏳ Загружаем задачи...')
    
    for await (const task of formsClient.iterRegisterTasks(2304918, { 
      includeArchived: false,
      batchSize: 200 
    })) {
      count2304918++
      
      // Проверка на дубликаты
      if (seenIds2304918.has(task.id)) {
        duplicates2304918++
        console.warn(`⚠️  Дубликат найден: task_id=${task.id}`)
      }
      seenIds2304918.add(task.id)
      
      // Прогресс каждые 500 задач
      if (count2304918 % 500 === 0) {
        console.log(`   Обработано: ${count2304918} задач`)
      }
    }
    
    console.log('\n✅ Форма 2304918 завершена:')
    console.log(`   📊 Всего задач: ${count2304918}`)
    console.log(`   🆔 Уникальных ID: ${seenIds2304918.size}`)
    console.log(`   ⚠️  Дубликатов: ${duplicates2304918}`)
    
    // Тест 2: Форма 792300 (новый клиент)
    console.log('\n📋 Тест 2: Форма 792300 (новый клиент)')
    console.log('-'.repeat(70))
    
    const seenIds792300 = new Set<number>()
    let count792300 = 0
    let duplicates792300 = 0
    
    console.log('⏳ Загружаем задачи...')
    
    for await (const task of formsClient.iterRegisterTasks(792300, { 
      includeArchived: false,
      batchSize: 200 
    })) {
      count792300++
      
      // Проверка на дубликаты
      if (seenIds792300.has(task.id)) {
        duplicates792300++
        console.warn(`⚠️  Дубликат найден: task_id=${task.id}`)
      }
      seenIds792300.add(task.id)
      
      // Прогресс каждые 500 задач
      if (count792300 % 500 === 0) {
        console.log(`   Обработано: ${count792300} задач`)
      }
    }
    
    console.log('\n✅ Форма 792300 завершена:')
    console.log(`   📊 Всего задач: ${count792300}`)
    console.log(`   🆔 Уникальных ID: ${seenIds792300.size}`)
    console.log(`   ⚠️  Дубликатов: ${duplicates792300}`)
    
    // Итоговый отчет
    console.log('\n' + '='.repeat(70))
    console.log('📊 ИТОГОВЫЙ ОТЧЕТ')
    console.log('='.repeat(70))
    
    const totalTasks = count2304918 + count792300
    const totalDuplicates = duplicates2304918 + duplicates792300
    
    console.log(`\n📈 Общая статистика:`)
    console.log(`   • Форма 2304918: ${count2304918} задач`)
    console.log(`   • Форма 792300: ${count792300} задач`)
    console.log(`   • Всего обработано: ${totalTasks} задач`)
    console.log(`   • Всего дубликатов: ${totalDuplicates}`)
    
    if (totalDuplicates === 0) {
      console.log('\n🎉 УСПЕХ! Дубликатов не обнаружено - пагинация работает корректно!')
    } else {
      console.log(`\n⚠️  ВНИМАНИЕ! Обнаружено ${totalDuplicates} дубликатов`)
    }
    
    // Сравнение с ожидаемыми значениями (если известны)
    console.log('\n💡 Проверьте:')
    console.log('   1. Количество задач соответствует ожидаемому?')
    console.log('   2. Все уникальные ID (нет дубликатов)?')
    console.log('   3. Процесс завершился без ошибок?')
    
  } catch (error) {
    console.error('\n❌ Ошибка при тестировании:', error instanceof Error ? error.message : String(error))
    console.error('\nДетали ошибки:')
    console.error(error)
    process.exit(1)
  }
}

// Запуск теста
console.log('🚀 Запуск теста пагинации...\n')
testPaginationFix()
  .then(() => {
    console.log('\n✅ Тест завершен успешно')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Тест завершен с ошибкой:', error)
    process.exit(1)
  })


