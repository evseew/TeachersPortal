#!/usr/bin/env ts-node
/**
 * Получение примеров задач из форм Pyrus для тестирования
 */

import { PyrusClientFactory } from '../lib/pyrus/client-factory'

async function getSampleTasks() {
  console.log('🔍 Получаем примеры задач из форм Pyrus...')
  
  try {
    const formsClient = PyrusClientFactory.createFormsClient()
    
    // Получаем по несколько задач из каждой формы
    console.log('\n📋 Форма 2304918 (старички):')
    let count = 0
    for await (const task of formsClient.iterRegisterTasks(2304918, { maxTasks: 3 })) {
      console.log(`  Task ID: ${task.id} - "${task.subject || 'Без названия'}"`)
      count++
      if (count >= 3) break
    }
    
    console.log('\n📋 Форма 792300 (новый клиент):')
    count = 0
    for await (const task of formsClient.iterRegisterTasks(792300, { maxTasks: 3 })) {
      console.log(`  Task ID: ${task.id} - "${task.subject || 'Без названия'}"`)
      count++
      if (count >= 3) break
    }
    
  } catch (error) {
    console.error('❌ Ошибка:', error instanceof Error ? error.message : String(error))
  }
}

getSampleTasks()
