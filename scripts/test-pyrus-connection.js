/**
 * Тест 1: Проверка подключения к Pyrus API и авторизации
 * 
 * Запуск: node scripts/test-pyrus-connection.js
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

async function testPyrusConnection() {
  console.log('🔐 Тест 1: Проверка авторизации в Pyrus API')
  console.log('=' * 50)
  
  const PYRUS_API_URL = process.env.PYRUS_API_URL
  const PYRUS_LOGIN = process.env.PYRUS_LOGIN
  const PYRUS_SECURITY_KEY = process.env.PYRUS_SECURITY_KEY
  
  console.log(`📡 API URL: ${PYRUS_API_URL}`)
  console.log(`👤 Login: ${PYRUS_LOGIN}`)
  console.log(`🔑 Security Key: ${PYRUS_SECURITY_KEY ? '✅ Установлен' : '❌ Отсутствует'}`)
  
  if (!PYRUS_LOGIN || !PYRUS_SECURITY_KEY) {
    console.error('❌ Отсутствуют учетные данные для Pyrus!')
    process.exit(1)
  }
  
  try {
    console.log('\n🚀 Отправляем запрос авторизации...')
    
    const authUrl = new URL('auth', PYRUS_API_URL).toString()
    console.log(`📍 URL авторизации: ${authUrl}`)
    
    const response = await fetch(authUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        login: PYRUS_LOGIN,
        security_key: PYRUS_SECURITY_KEY,
      }),
    })
    
    console.log(`📊 Статус ответа: ${response.status} ${response.statusText}`)
    
    if (!response.ok) {
      const errorText = await response.text()
      console.error(`❌ Ошибка авторизации: ${errorText}`)
      process.exit(1)
    }
    
    const data = await response.json()
    console.log('✅ Авторизация успешна!')
    console.log(`🎫 Access Token получен: ${data.access_token ? '✅ Да' : '❌ Нет'}`)
    
    if (data.access_token) {
      console.log(`🔑 Token (первые 20 символов): ${data.access_token.substring(0, 20)}...`)
      
      // Сохраняем токен для следующих тестов
      require('fs').writeFileSync(
        path.join(__dirname, 'pyrus-token.txt'), 
        data.access_token
      )
      console.log('💾 Токен сохранен в scripts/pyrus-token.txt')
    }
    
    console.log('\n🎉 Тест авторизации завершен успешно!')
    
  } catch (error) {
    console.error('❌ Ошибка при тестировании:', error.message)
    console.error('📋 Детали ошибки:', error)
    process.exit(1)
  }
}

// Проверяем, что fetch доступен (Node.js 18+)
if (typeof fetch === 'undefined') {
  console.error('❌ fetch не доступен. Убедитесь, что используете Node.js 18+')
  process.exit(1)
}

testPyrusConnection()
