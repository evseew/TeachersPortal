/**
 * Умный компонент аватара с поддержкой fallback
 * 
 * Автоматически подбирает лучший источник аватара:
 * 1. Gravatar (если есть)
 * 2. Генерируемый аватар
 * 3. Инициалы как fallback
 */

"use client"

import React, { useState } from "react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { getOptimalAvatarUrl, getInitials } from "@/lib/utils/avatar"

interface SmartAvatarProps {
  email: string
  name: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
  showTooltip?: boolean
  avatarUrl?: string | null
}

const sizeMap = {
  sm: { container: 'h-6 w-6', text: 'text-xs' },
  md: { container: 'h-8 w-8', text: 'text-sm' },
  lg: { container: 'h-10 w-10', text: 'text-base' },
  xl: { container: 'h-12 w-12', text: 'text-lg' }
}

export function SmartAvatar({ 
  email, 
  name, 
  size = 'md', 
  className = '',
  showTooltip = false,
  avatarUrl = null
}: SmartAvatarProps) {
  const [imageError, setImageError] = useState(false)
  const [primaryImageError, setPrimaryImageError] = useState(false)
  
  const sizeConfig = sizeMap[size]
  const pixelSize = size === 'sm' ? 24 : size === 'md' ? 32 : size === 'lg' ? 40 : 48
  
  const initials = getInitials(name)
  
  // Определяем, какой источник использовать
  let primaryImageUrl: string | null = null
  
  if (avatarUrl && !primaryImageError) {
    // Используем переданный avatar_url
    primaryImageUrl = avatarUrl
  } else if (!primaryImageError) {
    // Fallback на Gravatar
    primaryImageUrl = getOptimalAvatarUrl(email, name, { 
      size: pixelSize, 
      defaultType: 'gravatar' 
    })
  } else if (!imageError) {
    // Fallback на генерируемый аватар
    primaryImageUrl = getOptimalAvatarUrl(email, name, { 
      size: pixelSize, 
      defaultType: 'generated' 
    })
  }
  
  const avatarComponent = (
    <Avatar className={`${sizeConfig.container} ${className}`}>
      {primaryImageUrl && (
        <AvatarImage 
          src={primaryImageUrl} 
          alt={`${name} avatar`}
          onError={() => {
            if (!primaryImageError) {
              setPrimaryImageError(true)
            } else {
              setImageError(true)
            }
          }}
        />
      )}
      <AvatarFallback 
        className={`${sizeConfig.text} font-semibold bg-gradient-to-br from-blue-500 to-purple-600 text-white`}
      >
        {initials}
      </AvatarFallback>
    </Avatar>
  )
  
  if (showTooltip) {
    return (
      <div className="group relative">
        {avatarComponent}
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-black text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
          {name}
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-2 border-r-2 border-t-2 border-transparent border-t-black"></div>
        </div>
      </div>
    )
  }
  
  return avatarComponent
}

/**
 * Компонент для предпросмотра аватара с информацией об источнике
 */
interface AvatarPreviewProps {
  email: string
  name: string
  showSource?: boolean
  className?: string
}

export function AvatarPreview({ email, name, showSource = false, className = '' }: AvatarPreviewProps) {
  const [gravatarExists, setGravatarExists] = useState<boolean | null>(null)
  
  // Проверяем наличие Gravatar при монтировании
  React.useEffect(() => {
    const checkGravatar = async () => {
      try {
        const gravatarUrl = getOptimalAvatarUrl(email, name, { 
          size: 64, 
          defaultType: 'gravatar' 
        })
        const response = await fetch(gravatarUrl, { method: 'HEAD' })
        setGravatarExists(response.ok)
      } catch {
        setGravatarExists(false)
      }
    }
    
    checkGravatar()
  }, [email, name])
  
  return (
    <div className={`flex items-center space-x-3 ${className}`}>
      <SmartAvatar email={email} name={name} size="lg" />
      <div className="flex-1">
        <div className="font-medium">{name}</div>
        <div className="text-sm text-gray-500">{email}</div>
        {showSource && gravatarExists !== null && (
          <div className="text-xs text-gray-400 mt-1">
            {gravatarExists ? (
              <span className="text-green-600">✓ Gravatar найден</span>
            ) : (
              <span className="text-blue-600">🎨 Генерируемый аватар</span>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
