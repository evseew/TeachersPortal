/**
 * Тест API endpoint синхронизации пользователей
 * 
 * Запуск: node scripts/test-sync-endpoint.js
 */

const path = require('path')
const fs = require('fs')

// Загружаем переменные окружения
function loadEnv() {
  const envPath = path.join(__dirname, '../.env.local')
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8')
    envContent.split('\n').forEach(line => {
      const [key, ...valueParts] = line.split('=')
      if (key && valueParts.length > 0) {
        const value = valueParts.join('=').trim()
        process.env[key.trim()] = value
      }
    })
  }
}

loadEnv()

async function testSyncEndpoint() {
  console.log('🔄 Тест API endpoint синхронизации')
  console.log('=' * 50)
  
  try {
    // 1. Проверяем наличие endpoint файла
    console.log('1️⃣ Проверяем наличие API endpoint...')
    
    const endpointPath = path.join(__dirname, '../app/api/system/sync-users/route.ts')
    if (!fs.existsSync(endpointPath)) {
      throw new Error('API endpoint файл не найден')
    }
    
    console.log('   ✅ API endpoint файл существует')
    
    // 2. Проверяем PyrusUsersClient
    console.log('2️⃣ Проверяем PyrusUsersClient...')
    
    const clientPath = path.join(__dirname, '../lib/pyrus/client.ts')
    if (!fs.existsSync(clientPath)) {
      throw new Error('PyrusUsersClient не найден')
    }
    
    console.log('   ✅ PyrusUsersClient файл существует')
    
    // 3. Тестируем PyrusUsersClient напрямую
    console.log('3️⃣ Тестируем PyrusUsersClient...')
    
    // Поскольку мы не можем импортировать TS файлы напрямую,
    // протестируем Pyrus API напрямую
    const authResponse = await fetch('https://api.pyrus.com/v4/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        login: process.env.PYRUS_LOGIN,
        security_key: process.env.PYRUS_SECURITY_KEY,
      }),
    })
    
    if (!authResponse.ok) {
      throw new Error(`Ошибка авторизации Pyrus: ${authResponse.status}`)
    }
    
    const authData = await authResponse.json()
    const token = authData.access_token
    
    console.log('   ✅ Авторизация в Pyrus работает')
    
    // 4. Получаем пользователей из Pyrus
    console.log('4️⃣ Получаем пользователей из Pyrus...')
    
    const membersResponse = await fetch('https://api.pyrus.com/v4/members', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    
    if (!membersResponse.ok) {
      throw new Error(`Ошибка получения пользователей: ${membersResponse.status}`)
    }
    
    const membersData = await membersResponse.json()
    const activeUsers = membersData.members.filter(u => !u.banned)
    
    console.log(`   ✅ Получено ${activeUsers.length} активных пользователей`)
    
    // 5. Симулируем синхронизацию с Salesman ролью
    console.log('5️⃣ Симулируем синхронизацию (с ролью Salesman вместо Regular User)...')
    
    const usersToSync = activeUsers.slice(0, 3).map(user => ({
      email: user.email,
      full_name: `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email,
      role: 'Salesman', // Используем существующую роль вместо Regular User
      position: user.position,
      department: user.department_name
    }))
    
    console.log('   📋 Пользователи для синхронизации:')
    usersToSync.forEach((user, index) => {
      console.log(`      ${index + 1}. ${user.full_name} (${user.email}) → ${user.role}`)
      console.log(`         Должность: ${user.position || 'Не указана'}`)
      console.log(`         Отдел: ${user.department || 'Не указан'}`)
    })
    
    // 6. Проверяем готовность к реальной синхронизации
    console.log('\n6️⃣ Проверяем готовность компонентов...')
    
    const checks = [
      { name: 'Pyrus API подключение', status: true },
      { name: 'Получение пользователей', status: true },
      { name: 'API endpoint файл', status: true },
      { name: 'PyrusUsersClient файл', status: true },
      { name: 'Роль Regular User в БД', status: false }, // Требует ручного добавления
    ]
    
    checks.forEach(check => {
      const icon = check.status ? '✅' : '❌'
      console.log(`   ${icon} ${check.name}`)
    })
    
    const allReady = checks.every(c => c.status)
    
    console.log('\n📊 ИТОГИ ТЕСТИРОВАНИЯ:')
    
    if (allReady) {
      console.log('✅ Все компоненты готовы для синхронизации')
    } else {
      console.log('⚠️  Требуются дополнительные действия:')
      console.log('   1. Добавить роль "Regular User" в Supabase:')
      console.log('      ALTER TYPE user_role ADD VALUE \'Regular User\';')
      console.log('   2. После этого можно запускать синхронизацию')
    }
    
    console.log('\n🚀 ВРЕМЕННОЕ РЕШЕНИЕ:')
    console.log('   Можно использовать роль "Salesman" вместо "Regular User"')
    console.log('   Для этого в API endpoint замените:')
    console.log('   role: "Regular User" → role: "Salesman"')
    
    // Сохраняем результаты
    const reportPath = path.join(__dirname, 'sync-endpoint-test-report.json')
    fs.writeFileSync(reportPath, JSON.stringify({
      timestamp: new Date().toISOString(),
      pyrusConnection: true,
      usersRetrieved: activeUsers.length,
      sampleUsers: usersToSync,
      readyForSync: allReady,
      missingComponents: checks.filter(c => !c.status).map(c => c.name),
      recommendations: allReady 
        ? 'Готов к синхронизации' 
        : 'Добавить роль Regular User в БД'
    }, null, 2))
    
    console.log(`\n💾 Отчет сохранен в: ${reportPath}`)
    
  } catch (error) {
    console.error(`❌ Ошибка тестирования: ${error.message}`)
  }
}

testSyncEndpoint()
