/**
 * Утилиты для работы с аватарами пользователей
 * 
 * Поддерживает:
 * - Gravatar (универсальный сервис аватаров)
 * - UI Avatars (генерируемые аватары по имени)
 * - Fallback к инициалам
 */

// Простая функция для создания хеша из email (для Gravatar)
function createEmailHash(email: string): string {
  // Для серверной части используем простой алгоритм
  if (typeof window === 'undefined') {
    try {
      const crypto = require('crypto')
      return crypto.createHash('md5').update(email.toLowerCase().trim()).digest('hex')
    } catch {
      // Fallback если crypto недоступен
      return email.toLowerCase().replace(/[^a-z0-9]/g, '').substring(0, 32)
    }
  }
  
  // Для клиентской части используем простой хеш
  let hash = 0
  const str = email.toLowerCase().trim()
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32bit integer
  }
  return Math.abs(hash).toString(16).padStart(8, '0')
}

export interface AvatarOptions {
  size?: number
  defaultType?: 'gravatar' | 'initials' | 'generated'
  fallback?: string
}

/**
 * Получает URL аватара для email через Gravatar
 */
export function getGravatarUrl(email: string, options: AvatarOptions = {}): string {
  const { size = 40, fallback = 'mp' } = options
  
  // Создаем хеш от email (требование Gravatar)
  const emailHash = createEmailHash(email)
  
  return `https://www.gravatar.com/avatar/${emailHash}?s=${size}&d=${fallback}`
}

/**
 * Получает URL генерируемого аватара по имени
 */
export function getGeneratedAvatarUrl(name: string, options: AvatarOptions = {}): string {
  const { size = 40 } = options
  
  // Очищаем имя для URL
  const cleanName = encodeURIComponent(name.trim())
  
  // Используем UI Avatars для генерации красивых аватаров
  return `https://ui-avatars.com/api/?name=${cleanName}&size=${size}&background=random&color=fff&font-size=0.4&rounded=true`
}

/**
 * Получает инициалы из полного имени
 */
export function getInitials(name: string): string {
  if (!name) return '??'
  
  return name
    .split(' ')
    .filter(word => word.length > 0)
    .map(word => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) // Максимум 2 символа
}

/**
 * Получает оптимальный URL аватара с fallback логикой
 */
export function getOptimalAvatarUrl(email: string, name: string, options: AvatarOptions = {}): string {
  const { defaultType = 'gravatar', size = 40 } = options
  
  switch (defaultType) {
    case 'gravatar':
      // Сначала пробуем Gravatar, fallback на генерируемый
      return getGravatarUrl(email, { 
        ...options, 
        fallback: getGeneratedAvatarUrl(name, options)
      })
      
    case 'generated':
      return getGeneratedAvatarUrl(name, options)
      
    case 'initials':
    default:
      // Возвращаем null для использования компонента с инициалами
      return ''
  }
}

/**
 * Проверяет, существует ли аватар в Gravatar
 */
export async function checkGravatarExists(email: string): Promise<boolean> {
  try {
    const url = getGravatarUrl(email, { fallback: '404' })
    const response = await fetch(url, { method: 'HEAD' })
    return response.ok
  } catch {
    return false
  }
}

/**
 * Получает информацию об аватаре пользователя
 */
export interface AvatarInfo {
  url: string | null
  initials: string
  hasGravatar: boolean
  source: 'gravatar' | 'generated' | 'initials'
}

export async function getAvatarInfo(email: string, name: string, options: AvatarOptions = {}): Promise<AvatarInfo> {
  const initials = getInitials(name)
  
  // Проверяем наличие Gravatar
  const hasGravatar = await checkGravatarExists(email)
  
  if (hasGravatar) {
    return {
      url: getGravatarUrl(email, options),
      initials,
      hasGravatar: true,
      source: 'gravatar'
    }
  }
  
  // Используем генерируемый аватар если нет Gravatar
  if (options.defaultType === 'generated') {
    return {
      url: getGeneratedAvatarUrl(name, options),
      initials,
      hasGravatar: false,
      source: 'generated'
    }
  }
  
  // Fallback на инициалы
  return {
    url: null,
    initials,
    hasGravatar: false,
    source: 'initials'
  }
}
