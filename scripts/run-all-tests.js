/**
 * Мастер-скрипт для запуска всех тестов Pyrus интеграции
 * 
 * Запуск: node scripts/run-all-tests.js
 */

const { execSync } = require('child_process')
const path = require('path')
const fs = require('fs')

const TESTS = [
  {
    name: 'Тест 1: Авторизация в Pyrus',
    script: 'test-pyrus-connection.js',
    description: 'Проверка подключения к Pyrus API и получение токена авторизации'
  },
  {
    name: 'Тест 2: Получение пользователей',
    script: 'test-pyrus-members.js',
    description: 'Запрос списка пользователей и анализ структуры данных'
  },
  {
    name: 'Тест 3: Сопоставление ролей',
    script: 'test-role-mapping.js',
    description: 'Анализ ролей Pyrus и их сопоставление с ролями портала'
  },
  {
    name: 'Тест 4: Симуляция синхронизации',
    script: 'test-sync-logic.js',
    description: 'Моделирование процесса синхронизации пользователей'
  }
]

function runAllTests() {
  console.log('🚀 ЗАПУСК ВСЕХ ТЕСТОВ PYRUS ИНТЕГРАЦИИ')
  console.log('=' * 60)
  console.log(`📅 Время запуска: ${new Date().toLocaleString()}`)
  console.log('')
  
  const results = []
  
  for (let i = 0; i < TESTS.length; i++) {
    const test = TESTS[i]
    console.log(`${i + 1}/${TESTS.length} ${test.name}`)
    console.log(`📋 ${test.description}`)
    console.log('-' * 40)
    
    try {
      const startTime = Date.now()
      
      // Запускаем тест
      execSync(`node "${path.join(__dirname, test.script)}"`, {
        stdio: 'inherit',
        cwd: __dirname
      })
      
      const duration = Date.now() - startTime
      results.push({
        test: test.name,
        status: 'SUCCESS',
        duration: duration,
        message: `Завершен за ${duration}ms`
      })
      
      console.log(`\n✅ ${test.name} - УСПЕШНО (${duration}ms)\n`)
      
    } catch (error) {
      results.push({
        test: test.name,
        status: 'FAILED',
        duration: null,
        message: error.message
      })
      
      console.log(`\n❌ ${test.name} - ОШИБКА`)
      console.log(`📋 Детали: ${error.message}\n`)
      
      // Спрашиваем, продолжать ли тестирование
      if (i < TESTS.length - 1) {
        console.log('⚠️  Тест провален. Продолжить тестирование остальных? (Enter - продолжить, Ctrl+C - остановить)')
        // В реальности здесь можно добавить интерактивный ввод
        // Для автоматического режима просто продолжаем
      }
    }
  }
  
  // Выводим итоговый отчет
  console.log('📊 ИТОГОВЫЙ ОТЧЕТ')
  console.log('=' * 60)
  
  const successCount = results.filter(r => r.status === 'SUCCESS').length
  const failCount = results.filter(r => r.status === 'FAILED').length
  
  console.log(`✅ Успешных тестов: ${successCount}/${TESTS.length}`)
  console.log(`❌ Провальных тестов: ${failCount}/${TESTS.length}`)
  console.log('')
  
  results.forEach((result, index) => {
    const statusIcon = result.status === 'SUCCESS' ? '✅' : '❌'
    const duration = result.duration ? ` (${result.duration}ms)` : ''
    console.log(`${index + 1}. ${statusIcon} ${result.test}${duration}`)
    if (result.status === 'FAILED') {
      console.log(`   📋 ${result.message}`)
    }
  })
  
  // Показываем созданные файлы
  console.log('\n📁 СОЗДАННЫЕ ФАЙЛЫ:')
  const createdFiles = [
    'pyrus-token.txt',
    'pyrus-members-sample.json',
    'role-mapping.json',
    'sync-simulation.json'
  ]
  
  createdFiles.forEach(filename => {
    const filepath = path.join(__dirname, filename)
    if (fs.existsSync(filepath)) {
      const stats = fs.statSync(filepath)
      console.log(`   📄 ${filename} (${stats.size} байт)`)
    }
  })
  
  // Сохраняем отчет
  const reportPath = path.join(__dirname, 'test-report.json')
  fs.writeFileSync(reportPath, JSON.stringify({
    timestamp: new Date().toISOString(),
    summary: {
      total: TESTS.length,
      success: successCount,
      failed: failCount
    },
    results: results
  }, null, 2))
  
  console.log(`\n💾 Отчет сохранен в: test-report.json`)
  
  if (successCount === TESTS.length) {
    console.log('\n🎉 ВСЕ ТЕСТЫ ПРОШЛИ УСПЕШНО!')
    console.log('✅ Готов к интеграции в портал')
  } else {
    console.log('\n⚠️  ЕСТЬ ПРОБЛЕМЫ')
    console.log('📋 Проверьте ошибки перед интеграцией')
  }
}

// Проверяем версию Node.js
const nodeVersion = process.version
console.log(`🔧 Node.js версия: ${nodeVersion}`)

if (parseInt(nodeVersion.substring(1)) < 18) {
  console.error('❌ Требуется Node.js версии 18 или выше для поддержки fetch API')
  process.exit(1)
}

runAllTests()
