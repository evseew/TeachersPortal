/**
 * Утилита для надёжной загрузки Google Fonts с обработкой ошибок
 */

// Проверяем доступность Google Fonts
export const checkGoogleFontsAvailability = async (): Promise<boolean> => {
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 3000) // 3 секунды таймаут
    
    const response = await fetch('https://fonts.googleapis.com', {
      method: 'HEAD',
      signal: controller.signal,
    })
    
    clearTimeout(timeoutId)
    return response.ok
  } catch (error) {
    console.warn('Google Fonts недоступен, используем fallback шрифты:', error)
    return false
  }
}

// Применяем fallback стили если Google Fonts недоступен  
export const applyFontFallback = () => {
  if (typeof document === 'undefined') return

  const style = document.createElement('style')
  style.textContent = `
    /* Fallback стили для случаев когда Inter не загрузился */
    .font-fallback {
      font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', 
                   Roboto, 'Helvetica Neue', Arial, sans-serif !important;
    }
    
    /* Обеспечиваем плавный переход к fallback шрифту */
    body {
      font-display: swap;
    }
  `
  document.head.appendChild(style)
}

// Мониторим загрузку шрифтов
export const monitorFontLoading = () => {
  if (typeof document === 'undefined' || !document.fonts) return

  // Ждём загрузки Inter максимум 5 секунд
  const fontLoadTimeout = setTimeout(() => {
    console.warn('Inter шрифт не загрузился в течение 5 секунд, применяем fallback')
    applyFontFallback()
  }, 5000)

  // Отслеживаем когда шрифты загрузились
  document.fonts.ready.then(() => {
    clearTimeout(fontLoadTimeout)
    const interLoaded = document.fonts.check('1rem Inter')
    
    if (!interLoaded) {
      console.warn('Inter шрифт не найден, применяем fallback стили')
      applyFontFallback()
    } else {
      console.log('Inter шрифт успешно загружен')
    }
  }).catch((error) => {
    clearTimeout(fontLoadTimeout)
    console.error('Ошибка при загрузке шрифтов:', error)
    applyFontFallback()
  })
}
