/**
 * Тест 2: Получение списка пользователей из Pyrus API
 * 
 * Запуск: node scripts/test-pyrus-members.js
 */

const path = require('path')
const fs = require('fs')

// Загружаем переменные окружения из .env.local
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

async function testPyrusMembers() {
  console.log('👥 Тест 2: Получение пользователей из Pyrus API')
  console.log('=' * 50)
  
  // Пытаемся прочитать токен из предыдущего теста
  const tokenPath = path.join(__dirname, 'pyrus-token.txt')
  let accessToken = null
  
  if (fs.existsSync(tokenPath)) {
    accessToken = fs.readFileSync(tokenPath, 'utf8').trim()
    console.log('🎫 Используем сохраненный токен')
  } else {
    console.log('🔐 Токен не найден, выполняем авторизацию...')
    accessToken = await getNewToken()
  }
  
  if (!accessToken) {
    console.error('❌ Не удалось получить токен авторизации')
    process.exit(1)
  }
  
  try {
    console.log('\n📡 Запрашиваем список пользователей...')
    
    const membersUrl = new URL('members', process.env.PYRUS_API_URL).toString()
    console.log(`📍 URL: ${membersUrl}`)
    
    const response = await fetch(membersUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    })
    
    console.log(`📊 Статус ответа: ${response.status} ${response.statusText}`)
    
    if (!response.ok) {
      const errorText = await response.text()
      console.error(`❌ Ошибка получения пользователей: ${errorText}`)
      
      // Если токен истек, пробуем получить новый
      if (response.status === 401) {
        console.log('🔄 Токен истек, получаем новый...')
        accessToken = await getNewToken()
        if (accessToken) {
          return testPyrusMembers() // Повторяем запрос
        }
      }
      process.exit(1)
    }
    
    const data = await response.json()
    console.log('✅ Данные пользователей получены!')
    
    // Анализируем структуру данных
    console.log('\n📋 Анализ данных:')
    console.log(`📊 Общее количество пользователей: ${data.members?.length || 0}`)
    
    if (data.members && data.members.length > 0) {
      const sampleUser = data.members[0]
      console.log('\n👤 Образец данных пользователя:')
      console.log(JSON.stringify(sampleUser, null, 2))
      
      // Подсчитываем активных/заблокированных
      const activeUsers = data.members.filter(user => !user.banned)
      const bannedUsers = data.members.filter(user => user.banned)
      
      console.log(`\n📈 Статистика:`)
      console.log(`✅ Активных пользователей: ${activeUsers.length}`)
      console.log(`❌ Заблокированных пользователей: ${bannedUsers.length}`)
      
      // Анализируем должности (positions)
      const positions = [...new Set(data.members.map(user => user.position).filter(Boolean))]
      console.log(`\n🎭 Обнаруженные должности (${positions.length}):`)
      positions.forEach(position => console.log(`   - ${position}`))
      
      // Анализируем департаменты
      const departments = [...new Set(
        data.members
          .map(user => user.department_name)
          .filter(Boolean)
      )]
      console.log(`\n🏢 Обнаруженные департаменты (${departments.length}):`)
      departments.slice(0, 10).forEach(dept => console.log(`   - ${dept}`))
      if (departments.length > 10) {
        console.log(`   ... и еще ${departments.length - 10}`)
      }
      
      // Сохраняем данные для анализа
      const outputPath = path.join(__dirname, 'pyrus-members-sample.json')
      const sampleData = {
        totalUsers: data.members.length,
        activeUsers: activeUsers.length,
        bannedUsers: bannedUsers.length,
        positions: positions,
        departments: departments,
        sampleUsers: activeUsers.slice(0, 5).map(user => ({
          id: user.id,
          email: user.email,
          name: `${user.first_name || ''} ${user.last_name || ''}`.trim(),
          position: user.position,
          department: user.department_name,
          banned: user.banned,
        }))
      }
      
      fs.writeFileSync(outputPath, JSON.stringify(sampleData, null, 2))
      console.log(`\n💾 Образец данных сохранен в: ${outputPath}`)
    }
    
    console.log('\n🎉 Тест получения пользователей завершен успешно!')
    
  } catch (error) {
    console.error('❌ Ошибка при тестировании:', error.message)
    console.error('📋 Детали ошибки:', error)
    process.exit(1)
  }
}

async function getNewToken() {
  try {
    const authUrl = new URL('auth', process.env.PYRUS_API_URL).toString()
    
    const response = await fetch(authUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        login: process.env.PYRUS_LOGIN,
        security_key: process.env.PYRUS_SECURITY_KEY,
      }),
    })
    
    if (!response.ok) return null
    
    const data = await response.json()
    const token = data.access_token
    
    if (token) {
      // Сохраняем новый токен
      fs.writeFileSync(path.join(__dirname, 'pyrus-token.txt'), token)
    }
    
    return token
  } catch (error) {
    console.error('Ошибка авторизации:', error)
    return null
  }
}

// Проверяем, что fetch доступен
if (typeof fetch === 'undefined') {
  console.error('❌ fetch не доступен. Убедитесь, что используете Node.js 18+')
  process.exit(1)
}

testPyrusMembers()
