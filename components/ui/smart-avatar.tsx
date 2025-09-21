/**
 * Компонент аватара с локальными инициалами
 *
 * Использует только локальные инициалы пользователя.
 * Внешние сервисы аватаров (Gravatar, UI Avatars) отключены.
 */

"use client"

import React from "react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { getInitials } from "@/lib/utils/avatar"

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
  const sizeConfig = sizeMap[size]
  const initials = getInitials(name)

  // ВНЕШНИЕ АВАТАРЫ ОТКЛЮЧЕНЫ - используем только локальные инициалы

  const avatarComponent = (
    <Avatar className={`${sizeConfig.container} ${className}`}>
      {/* Внешние аватары отключены - показываем только инициалы */}
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
  return (
    <div className={`flex items-center space-x-3 ${className}`}>
      <SmartAvatar email={email} name={name} size="lg" />
      <div className="flex-1">
        <div className="font-medium">{name}</div>
        <div className="text-sm text-gray-500">{email}</div>
        {showSource && (
          <div className="text-xs text-gray-400 mt-1">
            <span className="text-blue-600">🎨 Локальные инициалы</span>
          </div>
        )}
      </div>
    </div>
  )
}
