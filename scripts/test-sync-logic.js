/**
 * Тест 4: Симуляция логики синхронизации пользователей
 * 
 * Запуск: node scripts/test-sync-logic.js
 */

const path = require('path')
const fs = require('fs')

function testSyncLogic() {
  console.log('🔄 Тест 4: Симуляция логики синхронизации')
  console.log('=' * 50)
  
  // Читаем данные из предыдущих тестов
  const membersDataPath = path.join(__dirname, 'pyrus-members-sample.json')
  const roleMappingPath = path.join(__dirname, 'role-mapping.json')
  
  if (!fs.existsSync(membersDataPath)) {
    console.error('❌ Файл pyrus-members-sample.json не найден!')
    console.error('📋 Сначала запустите: node scripts/test-pyrus-members.js')
    process.exit(1)
  }
  
  if (!fs.existsSync(roleMappingPath)) {
    console.error('❌ Файл role-mapping.json не найден!')
    console.error('📋 Сначала запустите: node scripts/test-role-mapping.js')
    process.exit(1)
  }
  
  const pyrusData = JSON.parse(fs.readFileSync(membersDataPath, 'utf8'))
  const roleMapping = JSON.parse(fs.readFileSync(roleMappingPath, 'utf8'))
  
  // Симулируем текущих пользователей в портале (пример данных)
  const currentPortalUsers = [
    {
      email: 'admin@example.com',
      name: 'Portal Admin',
      role: 'Administrator',
      category: null,
      branch_id: 'branch-1',
      source: 'manual' // пользователь создан вручную
    },
    {
      email: 'teacher1@example.com',
      name: 'Teacher One',
      role: 'Senior Teacher',
      category: 'Senior',
      branch_id: 'branch-2',
      source: 'pyrus' // пользователь был синхронизирован из Pyrus
    }
  ]
  
  console.log('📊 Текущие пользователи портала:')
  currentPortalUsers.forEach(user => {
    console.log(`   👤 ${user.name} (${user.email}) - ${user.role} [${user.source}]`)
  })
  
  console.log(`\n📡 Активные пользователи из Pyrus: ${pyrusData.activeUsers}`)
  
  // Симулируем процесс синхронизации
  console.log('\n🔄 Симуляция процесса синхронизации:')
  
  const syncResults = {
    toAdd: [],
    toUpdate: [],
    toDelete: [],
    unchanged: []
  }
  
  // Получаем активных пользователей из Pyrus (используем sample)
  const pyrusUsers = pyrusData.sampleUsers.map(user => ({
    email: user.email,
    name: user.name,
    role: roleMapping.positionToRoleMapping[user.position] || 'Salesman',
    originalPosition: user.position,
    department: user.department,
    source: 'pyrus'
  }))
  
  // Добавляем еще несколько тестовых пользователей для демонстрации
  pyrusUsers.push({
    email: 'teacher1@example.com', // уже существует в портале
    name: 'Teacher One Updated', // изменилось имя
    role: 'Teacher', // изменилась роль в Pyrus
    originalPosition: 'Преподаватель',
    department: 'Отдел обучения',
    source: 'pyrus'
  })
  
  console.log('\n1️⃣ Анализ изменений:')
  
  // Проверяем каждого пользователя из Pyrus
  pyrusUsers.forEach(pyrusUser => {
    const existingUser = currentPortalUsers.find(u => u.email === pyrusUser.email)
    
    if (!existingUser) {
      // Новый пользователь
      syncResults.toAdd.push({
        email: pyrusUser.email,
        name: pyrusUser.name,
        role: pyrusUser.role,
        originalPosition: pyrusUser.originalPosition,
        department: pyrusUser.department,
        category: null, // администратор установит позже
        branch_id: null // администратор установит позже
      })
      console.log(`   ➕ ДОБАВИТЬ: ${pyrusUser.name} (${pyrusUser.email}) - должность: ${pyrusUser.originalPosition} → роль: ${pyrusUser.role}`)
    } else {
      // Существующий пользователь - проверяем изменения
      const changes = []
      
      if (existingUser.name !== pyrusUser.name) {
        changes.push(`имя: "${existingUser.name}" → "${pyrusUser.name}"`)
      }
      
      // Роль обновляем только если пользователь был синхронизирован из Pyrus
      if (existingUser.source === 'pyrus' && existingUser.role !== pyrusUser.role) {
        changes.push(`роль: "${existingUser.role}" → "${pyrusUser.role}"`)
      }
      
      if (changes.length > 0) {
        syncResults.toUpdate.push({
          email: pyrusUser.email,
          changes: changes,
          newData: {
            name: pyrusUser.name,
            role: existingUser.source === 'pyrus' ? pyrusUser.role : existingUser.role
          },
          preserveLocalSettings: {
            category: existingUser.category,
            branch_id: existingUser.branch_id
          }
        })
        console.log(`   🔄 ОБНОВИТЬ: ${pyrusUser.email} - ${changes.join(', ')}`)
        console.log(`      💾 Сохраняем локальные настройки: категория=${existingUser.category}, филиал=${existingUser.branch_id}`)
      } else {
        syncResults.unchanged.push(pyrusUser.email)
        console.log(`   ✅ БЕЗ ИЗМЕНЕНИЙ: ${pyrusUser.email}`)
      }
    }
  })
  
  // Проверяем пользователей для удаления
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
  
  // Выводим итоговую статистику
  console.log('\n📊 Итоговая статистика синхронизации:')
  console.log(`   ➕ К добавлению: ${syncResults.toAdd.length}`)
  console.log(`   🔄 К обновлению: ${syncResults.toUpdate.length}`)
  console.log(`   🗑️  К удалению: ${syncResults.toDelete.length}`)
  console.log(`   ✅ Без изменений: ${syncResults.unchanged.length}`)
  
  // Сохраняем результаты симуляции
  const outputPath = path.join(__dirname, 'sync-simulation.json')
  fs.writeFileSync(outputPath, JSON.stringify({
    timestamp: new Date().toISOString(),
    currentPortalUsers: currentPortalUsers,
    pyrusUsers: pyrusUsers,
    syncResults: syncResults,
    summary: {
      toAdd: syncResults.toAdd.length,
      toUpdate: syncResults.toUpdate.length,
      toDelete: syncResults.toDelete.length,
      unchanged: syncResults.unchanged.length
    }
  }, null, 2))
  
  console.log(`\n💾 Результаты симуляции сохранены в: ${outputPath}`)
  
  console.log('\n🎉 Тест логики синхронизации завершен!')
  console.log('\n💡 Ключевые принципы синхронизации:')
  console.log('   1. Новые пользователи из Pyrus добавляются с ролью по умолчанию')
  console.log('   2. Базовые данные (имя, email) обновляются из Pyrus')
  console.log('   3. Локальные настройки (категория, филиал) сохраняются')
  console.log('   4. Роли обновляются только для пользователей, синхронизированных из Pyrus')
  console.log('   5. Пользователи, созданные вручную, не удаляются')
}

testSyncLogic()
