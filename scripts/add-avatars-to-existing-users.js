/**
 * Добавляем аватары существующим пользователям
 * 
 * Запуск: node scripts/add-avatars-to-existing-users.js
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

// Функции для генерации аватаров (копия из avatar.ts)
function getOptimalAvatarUrl(email, name, options = {}) {
  const { size = 64, defaultType = 'generated' } = options
  
  if (defaultType === 'generated') {
    const cleanName = encodeURIComponent(name.trim())
    return `https://ui-avatars.com/api/?name=${cleanName}&size=${size}&background=random&color=fff&font-size=0.4&rounded=true`
  }
  
  // Gravatar fallback
  const emailHash = crypto
    .createHash('md5')
    .update(email.toLowerCase().trim())
    .digest('hex')
  
  return `https://www.gravatar.com/avatar/${emailHash}?s=${size}&d=mp`
}

async function addAvatarsToExistingUsers() {
  console.log('🖼️  Добавляем аватары существующим пользователям')
  console.log('=' * 60)
  
  const env = loadEnv()
  const supabaseUrl = env.SUPABASE_URL
  const supabaseServiceRole = env.SUPABASE_SERVICE_ROLE
  
  if (!supabaseUrl || !supabaseServiceRole) {
    console.error('❌ Не найдены SUPABASE_URL или SUPABASE_SERVICE_ROLE в .env.local')
    process.exit(1)
  }
  
  const supabase = createClient(supabaseUrl, supabaseServiceRole, {
    auth: { persistSession: false }
  })
  
  try {
    console.log('📊 Получаем пользователей без аватаров...')
    
    // Получаем всех пользователей без avatar_url
    const { data: users, error: fetchError } = await supabase
      .from('profiles')
      .select('user_id, email, full_name, avatar_url')
      .is('avatar_url', null)
    
    if (fetchError) {
      throw fetchError
    }
    
    console.log(`👥 Найдено ${users.length} пользователей без аватаров`)
    
    if (users.length === 0) {
      console.log('✅ Все пользователи уже имеют аватары!')
      return
    }
    
    let updated = 0
    let errors = 0
    
    console.log('\n🔄 Обновляем пользователей...')
    
    for (const user of users) {
      try {
        // Генерируем URL аватара
        const avatarUrl = getOptimalAvatarUrl(user.email, user.full_name || user.email, {
          size: 64,
          defaultType: 'generated'
        })
        
        // Обновляем пользователя
        const { error: updateError } = await supabase
          .from('profiles')
          .update({ avatar_url: avatarUrl })
          .eq('user_id', user.user_id)
        
        if (updateError) {
          throw updateError
        }
        
        updated++
        console.log(`   ✅ ${user.full_name || user.email} (${user.email})`)
        
        // Небольшая пауза, чтобы не перегружать API
        if (updated % 10 === 0) {
          await new Promise(resolve => setTimeout(resolve, 100))
          console.log(`   📊 Обновлено ${updated}/${users.length}...`)
        }
        
      } catch (error) {
        errors++
        console.log(`   ❌ Ошибка для ${user.email}: ${error.message}`)
      }
    }
    
    console.log('\n📊 ИТОГИ:')
    console.log(`✅ Успешно обновлено: ${updated}`)
    console.log(`❌ Ошибок: ${errors}`)
    console.log(`📊 Всего пользователей: ${users.length}`)
    
    if (updated > 0) {
      console.log('\n🎉 Аватары успешно добавлены!')
      console.log('💡 Теперь перезагрузите страницу пользователей в браузере')
    }
    
    // Показываем примеры сгенерированных URL
    if (users.length > 0) {
      console.log('\n🔗 Примеры сгенерированных аватаров:')
      users.slice(0, 3).forEach(user => {
        const avatarUrl = getOptimalAvatarUrl(user.email, user.full_name || user.email, {
          size: 64,
          defaultType: 'generated'
        })
        console.log(`   ${user.full_name || user.email}: ${avatarUrl}`)
      })
    }
    
  } catch (error) {
    console.error('❌ Ошибка:', error.message)
    process.exit(1)
  }
}

addAvatarsToExistingUsers()
