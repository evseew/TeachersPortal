/**
 * Тест упрощенной логики синхронизации
 * Все новые пользователи получают роль "Salesman" (Regular User)
 * 
 * Запуск: node scripts/test-simplified-sync.js
 */

const path = require('path')
const fs = require('fs')

function testSimplifiedSync() {
  console.log('🔄 Тест упрощенной логики синхронизации')
  console.log('=' * 50)
  console.log('📋 Новая стратегия: все пользователи из Pyrus → роль "Salesman" (Regular User)')
  console.log('👤 Администратор вручную проставит правильные роли позже')
  console.log('')
  
  // Читаем данные из предыдущих тестов
  const membersDataPath = path.join(__dirname, 'pyrus-members-sample.json')
  
  if (!fs.existsSync(membersDataPath)) {
    console.error('❌ Файл pyrus-members-sample.json не найден!')
    console.error('📋 Сначала запустите: node scripts/test-pyrus-members.js')
    process.exit(1)
  }
  
  const pyrusData = JSON.parse(fs.readFileSync(membersDataPath, 'utf8'))
  
  // Симулируем текущих пользователей в портале
  const currentPortalUsers = [
    {
      email: 'admin@example.com',
      name: 'Portal Admin',
      role: 'Administrator',
      category: null,
      branch_id: 'branch-1',
      source: 'manual' // пользователь создан вручную
    }
  ]
  
  console.log('📊 Текущие пользователи портала:')
  currentPortalUsers.forEach(user => {
    console.log(`   👤 ${user.name} (${user.email}) - ${user.role} [${user.source}]`)
  })
  
  console.log(`\n📡 Активные пользователи из Pyrus: ${pyrusData.activeUsers}`)
  
  // Упрощенная логика синхронизации
  console.log('\n🔄 Упрощенная синхронизация:')
  
  const syncResults = {
    toAdd: [],
    toUpdate: [],
    toDelete: [],
    unchanged: []
  }
  
  const DEFAULT_ROLE = 'Regular User' // Роль для всех новых пользователей из Pyrus
  
  // Конвертируем пользователей из Pyrus
  const pyrusUsers = pyrusData.sampleUsers.map(user => ({
    email: user.email,
    name: user.name,
    role: DEFAULT_ROLE, // ВСЕ получают одинаковую роль!
    position: user.position, // сохраняем для справки
    department: user.department,
    source: 'pyrus'
  }))
  
  console.log('\n1️⃣ Анализ с упрощенной логикой:')
  
  pyrusUsers.forEach(pyrusUser => {
    const existingUser = currentPortalUsers.find(u => u.email === pyrusUser.email)
    
    if (!existingUser) {
      // Новый пользователь - всегда роль по умолчанию
      syncResults.toAdd.push({
        email: pyrusUser.email,
        name: pyrusUser.name,
        role: DEFAULT_ROLE, // Единая роль для всех!
        position: pyrusUser.position,
        department: pyrusUser.department,
        category: null, // администратор установит
        branch_id: null // администратор установит
      })
      console.log(`   ➕ ДОБАВИТЬ: ${pyrusUser.name} (${pyrusUser.email})`)
      console.log(`      📝 Должность в Pyrus: ${pyrusUser.position || 'Не указана'}`)
      console.log(`      🎭 Роль на портале: ${DEFAULT_ROLE} (будет изменена администратором)`)
    } else {
      // Существующий пользователь - обновляем только базовую информацию
      const changes = []
      
      if (existingUser.name !== pyrusUser.name) {
        changes.push(`имя: "${existingUser.name}" → "${pyrusUser.name}"`)
      }
      
      // РОЛЬ НЕ ТРОГАЕМ! Только если пользователь из Pyrus и роль еще дефолтная
      if (existingUser.source === 'pyrus' && existingUser.role === DEFAULT_ROLE) {
        // Роль остается той же (дефолтной), пока админ не поменяет
        changes.push(`роль: остается ${DEFAULT_ROLE} (ждет настройки администратора)`)
      }
      
      if (changes.length > 0) {
        syncResults.toUpdate.push({
          email: pyrusUser.email,
          changes: changes.filter(c => !c.includes('роль: остается')),
          newData: {
            name: pyrusUser.name,
            role: existingUser.role // СОХРАНЯЕМ существующую роль!
          },
          preserveLocalSettings: {
            category: existingUser.category,
            branch_id: existingUser.branch_id
          }
        })
        
        if (changes.filter(c => !c.includes('роль: остается')).length > 0) {
          console.log(`   🔄 ОБНОВИТЬ: ${pyrusUser.email}`)
          changes.forEach(change => {
            if (!change.includes('роль: остается')) {
              console.log(`      📝 ${change}`)
            }
          })
          console.log(`      💾 Сохраняем: роль=${existingUser.role}, категория=${existingUser.category}, филиал=${existingUser.branch_id}`)
        } else {
          syncResults.unchanged.push(pyrusUser.email)
          console.log(`   ✅ БЕЗ ИЗМЕНЕНИЙ: ${pyrusUser.email} (роль уже настроена администратором)`)
        }
      } else {
        syncResults.unchanged.push(pyrusUser.email)
        console.log(`   ✅ БЕЗ ИЗМЕНЕНИЙ: ${pyrusUser.email}`)
      }
    }
  })
  
  // Проверяем удаления (логика не изменилась)
  console.log('\n2️⃣ Проверка пользователей для удаления:')
  currentPortalUsers.forEach(portalUser => {
    if (portalUser.source === 'pyrus') {
      const stillExists = pyrusUsers.find(p => p.email === portalUser.email)
      if (!stillExists) {
        syncResults.toDelete.push({
          email: portalUser.email,
          name: portalUser.name,
          role: portalUser.role
        })
        console.log(`   🗑️  УДАЛИТЬ: ${portalUser.name} (${portalUser.email}) - больше не активен в Pyrus`)
      }
    } else {
      console.log(`   🔒 СОХРАНИТЬ: ${portalUser.email} - создан вручную`)
    }
  })
  
  // Итоговая статистика
  console.log('\n📊 Итоговая статистика упрощенной синхронизации:')
  console.log(`   ➕ К добавлению: ${syncResults.toAdd.length} (все с ролью "${DEFAULT_ROLE}")`)
  console.log(`   🔄 К обновлению: ${syncResults.toUpdate.length}`)
  console.log(`   🗑️  К удалению: ${syncResults.toDelete.length}`)
  console.log(`   ✅ Без изменений: ${syncResults.unchanged.length}`)
  
  // Показываем план работы для администратора
  console.log('\n👨‍💼 ПЛАН РАБОТЫ ДЛЯ АДМИНИСТРАТОРА:')
  console.log('После синхронизации администратор должен:')
  
  const departmentStats = {}
  syncResults.toAdd.forEach(user => {
    const dept = user.department || 'Без отдела'
    departmentStats[dept] = (departmentStats[dept] || 0) + 1
  })
  
  Object.entries(departmentStats).forEach(([dept, count]) => {
    let suggestedRole = 'Teacher' // по умолчанию
    
    if (dept === 'Отдел обучения') {
      suggestedRole = 'Teacher или Senior Teacher'
    } else if (dept === 'Управляющая компания') {
      suggestedRole = 'Administrator или Head of Sales'
    } else if (dept === 'Отдел продаж') {
      suggestedRole = 'Salesman или Head of Sales'
    } else if (dept === 'СО' || dept === 'КЦ') {
      suggestedRole = 'Administrator или Salesman'
    }
    
    console.log(`   🏢 ${dept}: ${count} чел. → рекомендуемые роли: ${suggestedRole}`)
  })
  
  // Сохраняем результаты
  const outputPath = path.join(__dirname, 'simplified-sync-simulation.json')
  fs.writeFileSync(outputPath, JSON.stringify({
    timestamp: new Date().toISOString(),
    strategy: 'simplified',
    defaultRole: DEFAULT_ROLE,
    pyrusUsers: pyrusUsers,
    syncResults: syncResults,
    departmentStats: departmentStats,
    adminInstructions: 'После синхронизации администратор должен вручную назначить правильные роли всем пользователям',
    summary: {
      toAdd: syncResults.toAdd.length,
      toUpdate: syncResults.toUpdate.length,
      toDelete: syncResults.toDelete.length,
      unchanged: syncResults.unchanged.length
    }
  }, null, 2))
  
  console.log(`\n💾 Результаты упрощенной симуляции сохранены в: ${outputPath}`)
  
  console.log('\n🎉 Упрощенная синхронизация готова!')
  console.log('\n💡 Преимущества новой стратегии:')
  console.log('   ✅ Безопасность - никто не получает лишних прав')
  console.log('   ✅ Простота - нет сложной логики сопоставления ролей')
  console.log('   ✅ Контроль - администратор полностью контролирует права')
  console.log('   ✅ Гибкость - легко изменить логику в будущем')
}

testSimplifiedSync()
