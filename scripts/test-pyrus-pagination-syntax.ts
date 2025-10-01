#!/usr/bin/env tsx
/**
 * Тестирование различных синтаксисов пагинации Pyrus API
 */

import { PyrusClientFactory } from '../lib/pyrus/client-factory'

async function testPaginationSyntax() {
  console.log('🧪 Тестирование синтаксисов пагинации Pyrus API\n')
  
  const formsClient = PyrusClientFactory.createFormsClient()
  const baseClient = (formsClient as any).client || formsClient
  
  // Получаем первую страницу
  const response1 = await (baseClient as any).get(
    'forms/2304918/register?item_count=5&include_archived=n&sort=id'
  )
  
  if (!response1?.tasks?.length) {
    console.log('❌ Не удалось получить первую страницу')
    return
  }
  
  const lastTaskId = response1.tasks[response1.tasks.length - 1].id
  console.log(`📊 Первая страница: ${response1.tasks.length} задач`)
  console.log(`   Последняя задача ID: ${lastTaskId}\n`)
  
  // Тестируем различные синтаксисы
  const testCases = [
    { name: 'PostgREST синтаксис', url: `forms/2304918/register?item_count=5&include_archived=n&sort=id&id=lt.${lastTaskId}` },
    { name: 'max_task_id (старый)', url: `forms/2304918/register?item_count=5&include_archived=n&max_task_id=${lastTaskId}` },
    { name: 'task_id с <', url: `forms/2304918/register?item_count=5&include_archived=n&sort=id&task_id<${lastTaskId}` },
    { name: 'modified_before (time)', url: `forms/2304918/register?item_count=5&include_archived=n&modified_before=${response1.tasks[response1.tasks.length - 1].last_modified_date}` },
    { name: 'id[lt]', url: `forms/2304918/register?item_count=5&include_archived=n&sort=id&id[lt]=${lastTaskId}` },
  ]
  
  for (const testCase of testCases) {
    console.log(`\n🧪 Тест: ${testCase.name}`)
    console.log(`   URL: ${testCase.url.substring(0, 80)}...`)
    
    try {
      const response = await (baseClient as any).get(testCase.url)
      
      if (response?.tasks?.length > 0) {
        const firstId = response.tasks[0].id
        console.log(`   ✅ Успех! Получено ${response.tasks.length} задач`)
        console.log(`   📌 Первая задача ID: ${firstId}`)
        
        if (firstId < lastTaskId) {
          console.log(`   ✅ Keyset работает: ${firstId} < ${lastTaskId}`)
        } else {
          console.log(`   ⚠️  Keyset НЕ работает: ${firstId} >= ${lastTaskId}`)
        }
      } else {
        console.log(`   ⚠️  Пустой ответ`)
      }
    } catch (error: any) {
      console.log(`   ❌ Ошибка: ${error.message}`)
    }
  }
}

testPaginationSyntax().catch(console.error)

