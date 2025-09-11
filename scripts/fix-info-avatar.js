/**
 * Исправляем аватар для info@planetenglish.ru
 * Проверяем разные варианты и обновляем в БД
 */

const { createClient } = require('@supabase/supabase-js')
const crypto = require('crypto')
const fs = require('fs')
const path = require('path')

// Загружаем переменные окружения
function loadEnv() {
  const envPath = path.join(__dirname, '../.env.local')
  const env = {}
  
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8')
    envContent.split('\n').forEach(line => {
      const [key, ...valueParts] = line.split('=')
      if (key && valueParts.length > 0) {
        const value = valueParts.join('=').trim()
        env[key.trim()] = value
      }
    })
  }
  
  return env
}

function createGravatarUrl(email, options = {}) {
  const { size = 64, fallback = 'mp' } = options
  
  const emailHash = crypto
    .createHash('md5')
    .update(email.toLowerCase().trim())
    .digest('hex')
  
  return `https://www.gravatar.com/avatar/${emailHash}?s=${size}&d=${fallback}`
}

async function checkAndFixAvatar() {
  console.log('🖼️  Исправляем аватар для info@planetenglish.ru')
  console.log('=' * 50)
  
  const env = loadEnv()
  const supabaseUrl = env.SUPABASE_URL
  const supabaseServiceRole = env.SUPABASE_SERVICE_ROLE
  
  if (!supabaseUrl || !supabaseServiceRole) {
    console.error('❌ Не найдены переменные Supabase')
    process.exit(1)
  }
  
  const supabase = createClient(supabaseUrl, supabaseServiceRole, {
    auth: { persistSession: false }
  })
  
  const email = 'info@planetenglish.ru'
  
  // Тестируем разные варианты Gravatar
  const variants = [
    { email, desc: 'Исходный email' },
    { email: 'konstantin@planetenglish.ru', desc: 'Возможный личный email' },
    { email: 'admin@planetenglish.ru', desc: 'Админский email' }
  ]
  
  console.log('🔍 Проверяем варианты Gravatar...')
  
  let bestAvatarUrl = null
  
  for (const variant of variants) {
    console.log(`\n📧 Проверяем: ${variant.email} (${variant.desc})`)
    
    // Проверяем с 404 fallback
    const testUrl = createGravatarUrl(variant.email, { fallback: '404' })
    console.log(`   URL: ${testUrl}`)
    
    try {
      const response = await fetch(testUrl, { method: 'HEAD' })
      if (response.ok) {
        console.log(`   ✅ Найден Gravatar!`)
        bestAvatarUrl = createGravatarUrl(variant.email)
        break
      } else {
        console.log(`   ❌ Не найден (${response.status})`)
      }
    } catch (error) {
      console.log(`   ❌ Ошибка: ${error.message}`)
    }
  }
  
  // Если не нашли Gravatar, попробуем с обычным fallback
  if (!bestAvatarUrl) {
    console.log('\n🎨 Gravatar не найден, используем Gravatar с fallback...')
    bestAvatarUrl = createGravatarUrl(email, { fallback: 'identicon' })
    console.log(`   URL: ${bestAvatarUrl}`)
  }
  
  // Обновляем в базе данных
  console.log('\n💾 Обновляем в базе данных...')
  
  try {
    const { error } = await supabase
      .from('profiles')
      .update({ avatar_url: bestAvatarUrl })
      .eq('email', email)
    
    if (error) {
      throw error
    }
    
    console.log('✅ Аватар успешно обновлен!')
    console.log(`🔗 Новый URL: ${bestAvatarUrl}`)
    
    // Проверяем результат
    const { data: user } = await supabase
      .from('profiles')
      .select('email, full_name, avatar_url')
      .eq('email', email)
      .single()
    
    if (user) {
      console.log('\n📊 Результат:')
      console.log(`   Имя: ${user.full_name}`)
      console.log(`   Email: ${user.email}`)
      console.log(`   Аватар: ${user.avatar_url}`)
      console.log('\n💡 Обновите страницу в браузере для просмотра изменений')
    }
    
  } catch (error) {
    console.error('❌ Ошибка обновления:', error.message)
  }
}

checkAndFixAvatar()
