/**
 * Проверяем все возможные сервисы аватаров
 */

const crypto = require('crypto')

function createMD5Hash(text) {
  return crypto.createHash('md5').update(text.toLowerCase().trim()).digest('hex')
}

async function checkAvatarServices(email) {
  console.log(`🔍 Проверяем все сервисы аватаров для: ${email}`)
  console.log('=' * 60)
  
  const hash = createMD5Hash(email)
  
  const services = [
    {
      name: 'Gravatar (default)',
      url: `https://www.gravatar.com/avatar/${hash}?s=64&d=mp`
    },
    {
      name: 'Gravatar (404 test)',
      url: `https://www.gravatar.com/avatar/${hash}?s=64&d=404`
    },
    {
      name: 'Gravatar (identicon)',
      url: `https://www.gravatar.com/avatar/${hash}?s=64&d=identicon`
    },
    {
      name: 'Gravatar (monsterid)',
      url: `https://www.gravatar.com/avatar/${hash}?s=64&d=monsterid`
    },
    {
      name: 'Gravatar (wavatar)',
      url: `https://www.gravatar.com/avatar/${hash}?s=64&d=wavatar`
    },
    {
      name: 'Gravatar (retro)',
      url: `https://www.gravatar.com/avatar/${hash}?s=64&d=retro`
    },
    {
      name: 'Gravatar (robohash)',
      url: `https://www.gravatar.com/avatar/${hash}?s=64&d=robohash`
    }
  ]
  
  console.log(`📧 Email: ${email}`)
  console.log(`🔑 MD5 Hash: ${hash}`)
  console.log('')
  
  for (const service of services) {
    try {
      console.log(`🌐 ${service.name}:`)
      console.log(`   ${service.url}`)
      
      const response = await fetch(service.url, { method: 'HEAD' })
      console.log(`   Status: ${response.status} ${response.statusText}`)
      
      if (response.headers.has('content-length')) {
        console.log(`   Size: ${response.headers.get('content-length')} bytes`)
      }
      
      if (response.headers.has('content-type')) {
        console.log(`   Type: ${response.headers.get('content-type')}`)
      }
      
      // Специальная проверка для Gravatar 404 test
      if (service.name === 'Gravatar (404 test)') {
        if (response.status === 200) {
          console.log(`   ✅ РЕАЛЬНЫЙ GRAVATAR НАЙДЕН!`)
        } else {
          console.log(`   ❌ Реального Gravatar нет`)
        }
      } else {
        console.log(`   ${response.ok ? '✅' : '❌'} ${response.ok ? 'Доступен' : 'Недоступен'}`)
      }
      
    } catch (error) {
      console.log(`   ❌ Ошибка: ${error.message}`)
    }
    
    console.log('')
  }
  
  // Дополнительная проверка - может быть фото есть, но очень большое?
  console.log('🔍 Дополнительная проверка с полным запросом...')
  try {
    const fullResponse = await fetch(`https://www.gravatar.com/avatar/${hash}?s=200&d=404`)
    
    if (fullResponse.ok) {
      const buffer = await fullResponse.arrayBuffer()
      console.log(`📊 Полный запрос: ${buffer.byteLength} байт`)
      
      if (buffer.byteLength > 1000) {
        console.log('✅ Возможно, есть реальное изображение!')
        return `https://www.gravatar.com/avatar/${hash}?s=64`
      }
    }
  } catch (error) {
    console.log(`❌ Ошибка полного запроса: ${error.message}`)
  }
  
  return null
}

// Проверяем основной email
checkAvatarServices('info@planetenglish.ru')
