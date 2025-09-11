/**
 * Проверяем Gravatar для конкретного email
 */

const crypto = require('crypto')

function createGravatarUrl(email, size = 64) {
  const emailHash = crypto
    .createHash('md5')
    .update(email.toLowerCase().trim())
    .digest('hex')
  
  return `https://www.gravatar.com/avatar/${emailHash}?s=${size}&d=404`
}

async function checkGravatar(email) {
  console.log(`🔍 Проверяем Gravatar для: ${email}`)
  
  const gravatarUrl = createGravatarUrl(email, 64)
  console.log(`🌐 URL: ${gravatarUrl}`)
  
  try {
    const response = await fetch(gravatarUrl, { method: 'HEAD' })
    
    if (response.ok) {
      console.log(`✅ Gravatar найден! Status: ${response.status}`)
      
      // Проверим также с обычным fallback
      const normalUrl = createGravatarUrl(email, 64).replace('&d=404', '&d=mp')
      console.log(`📸 Реальный URL для использования: ${normalUrl}`)
      
      return { exists: true, url: normalUrl }
    } else {
      console.log(`❌ Gravatar не найден. Status: ${response.status}`)
      return { exists: false, url: null }
    }
  } catch (error) {
    console.log(`❌ Ошибка проверки: ${error.message}`)
    return { exists: false, url: null }
  }
}

// Проверяем info@planetenglish.ru
checkGravatar('info@planetenglish.ru')
