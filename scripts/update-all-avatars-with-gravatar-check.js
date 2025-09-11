/**
 * Обновляем всех пользователей с улучшенной проверкой Gravatar
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

function createGeneratedAvatarUrl(name, size = 64) {
  const cleanName = encodeURIComponent(name.trim())
  return `https://ui-avatars.com/api/?name=${cleanName}&size=${size}&background=random&color=fff&font-size=0.4&rounded=true`
}

async function hasRealGravatar(email) {
  try {
    const testUrl = createGravatarUrl(email, { fallback: '404' })
    const response = await fetch(testUrl, { method: 'HEAD' })
    return response.ok
  } catch {
    return false
  }
}

async function updateAllAvatars() {
  console.log('🖼️  Обновляем аватары всех пользователей с проверкой Gravatar')
  console.log('=' * 70)
  
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
  
  try {
    console.log('📊 Получаем всех пользователей...')
    
    const { data: users, error: fetchError } = await supabase
      .from('profiles')
      .select('user_id, email, full_name, avatar_url')
      .order('full_name')
    
    if (fetchError) throw fetchError
    
    console.log(`👥 Найдено ${users.length} пользователей`)
    
    let updated = 0
    let withGravatar = 0
    let withGenerated = 0
    let errors = 0
    
    console.log('\n🔄 Проверяем и обновляем аватары...\n')
    
    for (const user of users) {
      try {
        process.stdout.write(`📧 ${user.email.padEnd(35)} `)
        
        // Проверяем, есть ли реальный Gravatar
        const hasGravatar = await hasRealGravatar(user.email)
        
        let newAvatarUrl
        let source
        
        if (hasGravatar) {
          // Используем Gravatar
          newAvatarUrl = createGravatarUrl(user.email, { size: 64 })
          source = 'Gravatar'
          withGravatar++
        } else {
          // Используем генерируемый аватар
          newAvatarUrl = createGeneratedAvatarUrl(user.full_name || user.email, 64)
          source = 'Generated'
          withGenerated++
        }
        
        // Обновляем только если URL изменился
        if (user.avatar_url !== newAvatarUrl) {
          const { error: updateError } = await supabase
            .from('profiles')
            .update({ avatar_url: newAvatarUrl })
            .eq('user_id', user.user_id)
          
          if (updateError) throw updateError
          
          updated++
          console.log(`✅ ${source}`)
        } else {
          console.log(`→ ${source} (без изменений)`)
        }
        
        // Пауза для избежания перегрузки API
        if ((withGravatar + withGenerated) % 20 === 0) {
          await new Promise(resolve => setTimeout(resolve, 500))
        }
        
      } catch (error) {
        errors++
        console.log(`❌ Ошибка: ${error.message}`)
      }
    }
    
    console.log('\n📊 ИТОГИ:')
    console.log(`👥 Всего пользователей: ${users.length}`)
    console.log(`🖼️  С реальными Gravatar: ${withGravatar}`)
    console.log(`🎨 С генерируемыми аватарами: ${withGenerated}`)
    console.log(`✅ Обновлено записей: ${updated}`)
    console.log(`❌ Ошибок: ${errors}`)
    
    if (withGravatar > 0) {
      console.log('\n🎉 Найдены пользователи с настроенными Gravatar!')
      
      // Показываем пользователей с Gravatar
      console.log('\n👤 Пользователи с реальными Gravatar:')
      for (const user of users) {
        if (await hasRealGravatar(user.email)) {
          console.log(`   ${user.full_name} (${user.email})`)
        }
      }
    }
    
    console.log('\n💡 Обновите страницу в браузере для просмотра изменений!')
    
  } catch (error) {
    console.error('❌ Критическая ошибка:', error.message)
    process.exit(1)
  }
}

updateAllAvatars()
