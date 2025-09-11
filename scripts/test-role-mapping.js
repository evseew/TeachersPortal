/**
 * Тест 3: Сопоставление ролей Pyrus с ролями Портала
 * 
 * Запуск: node scripts/test-role-mapping.js
 */

const path = require('path')
const fs = require('fs')

// Роли портала (из константы USER_ROLES)
const PORTAL_ROLES = [
  "Administrator", 
  "Senior Teacher", 
  "Teacher", 
  "Salesman", 
  "Head of Sales"
]

function testRoleMapping() {
  console.log('🎭 Тест 3: Сопоставление ролей Pyrus ↔ Портал')
  console.log('=' * 50)
  
  // Читаем данные из предыдущего теста
  const dataPath = path.join(__dirname, 'pyrus-members-sample.json')
  
  if (!fs.existsSync(dataPath)) {
    console.error('❌ Файл pyrus-members-sample.json не найден!')
    console.error('📋 Сначала запустите: node scripts/test-pyrus-members.js')
    process.exit(1)
  }
  
  const pyrusData = JSON.parse(fs.readFileSync(dataPath, 'utf8'))
  
  console.log('📊 Роли портала:')
  PORTAL_ROLES.forEach(role => console.log(`   ✅ ${role}`))
  
  console.log(`\n📊 Должности из Pyrus (${pyrusData.positions.length}):`)
  pyrusData.positions.forEach(position => console.log(`   📝 ${position}`))
  
  // Создаем карту сопоставления должностей с ролями портала
  const positionToRoleMapping = {}
  const unmappedPositions = []
  
  console.log('\n🔗 Сопоставление должностей → роли портала:')
  
  pyrusData.positions.forEach(pyrusPosition => {
    // Пытаемся сопоставить должности с ролями портала
    const lowercasePosition = pyrusPosition.toLowerCase()
    let mappedRole = 'Salesman' // роль по умолчанию
    
    if (lowercasePosition.includes('администратор') && !lowercasePosition.includes('система')) {
      mappedRole = 'Administrator'
    } else if (lowercasePosition.includes('старший преподаватель') || lowercasePosition.includes('старш') && lowercasePosition.includes('преподав')) {
      mappedRole = 'Senior Teacher'
    } else if (lowercasePosition.includes('преподаватель')) {
      mappedRole = 'Teacher'
    } else if (lowercasePosition.includes('руководитель') || lowercasePosition.includes('директор') || lowercasePosition.includes('генеральный')) {
      mappedRole = 'Head of Sales'
    } else if (lowercasePosition.includes('менеджер') || lowercasePosition.includes('оператор') || lowercasePosition.includes('специалист')) {
      mappedRole = 'Salesman'
    }
    
    positionToRoleMapping[pyrusPosition] = mappedRole
    
    if (mappedRole === 'Salesman' && !lowercasePosition.includes('менеджер') && !lowercasePosition.includes('оператор') && !lowercasePosition.includes('специалист')) {
      console.log(`   ⚠️  ${pyrusPosition} → ${mappedRole} (по умолчанию, требует проверки)`)
      unmappedPositions.push(pyrusPosition)
    } else {
      console.log(`   🔄 ${pyrusPosition} → ${mappedRole} (автоматическое)`)
    }
  })
  
  // Показываем статистику сопоставления пользователей
  console.log('\n👥 Примеры сопоставления для пользователей:')
  pyrusData.sampleUsers.forEach(user => {
    const originalPosition = user.position || 'Не указана'
    const mappedRole = positionToRoleMapping[user.position] || 'Salesman'
    
    console.log(`   👤 ${user.name} (${user.email})`)
    console.log(`      Pyrus: ${originalPosition} → Портал: ${mappedRole}`)
  })
  
  if (unmappedPositions.length > 0) {
    console.log(`\n⚠️  Должности, требующие ручной проверки (${unmappedPositions.length}):`)
    unmappedPositions.forEach(position => console.log(`   ❓ ${position}`))
    console.log('\n💡 Рекомендация: проверьте эти должности и при необходимости скорректируйте логику маппинга')
  }
  
  // Сохраняем карту сопоставления
  const mappingResult = {
    portalRoles: PORTAL_ROLES,
    pyrusPositions: pyrusData.positions,
    positionToRoleMapping: positionToRoleMapping,
    unmappedPositions: unmappedPositions,
    statistics: {
      totalPyrusPositions: pyrusData.positions.length,
      automaticMappings: Object.values(positionToRoleMapping).filter(mapped => 
        mapped !== 'Salesman'
      ).length,
      defaultMappings: Object.values(positionToRoleMapping).filter(mapped => 
        mapped === 'Salesman'
      ).length,
      needsReview: unmappedPositions.length
    }
  }
  
  const outputPath = path.join(__dirname, 'role-mapping.json')
  fs.writeFileSync(outputPath, JSON.stringify(mappingResult, null, 2))
  console.log(`\n💾 Карта сопоставления ролей сохранена в: ${outputPath}`)
  
  console.log('\n🎉 Тест сопоставления ролей завершен!')
}

testRoleMapping()
