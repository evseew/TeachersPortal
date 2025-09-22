"use client"

import { signIn } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function DevLoginPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleDevLogin = async () => {
    if (process.env.NODE_ENV !== 'development') {
      setError('Dev login доступен только в режиме разработки')
      return
    }

    setIsLoading(true)
    setError(null)
    
    try {
      // Сначала убеждаемся, что dev пользователь существует в БД
      const addUserResponse = await fetch('/api/dev/add-user', {
        method: 'POST',
      })

      if (!addUserResponse.ok) {
        throw new Error('Не удалось создать dev пользователя')
      }

      const addUserResult = await addUserResponse.json()
      console.log('Dev user status:', addUserResult.message)

      // Теперь пытаемся войти
      const result = await signIn('dev-auto-login', {
        redirect: false,
      })

      if (result?.ok) {
        // Успешный логин, перенаправляем на dashboard
        router.push('/dashboard')
      } else {
        throw new Error(result?.error || 'Ошибка входа в систему')
      }
    } catch (error: unknown) {
      console.error('Ошибка автологина:', error)
      const errorMessage = error instanceof Error ? error.message : 'Произошла ошибка при входе'
      setError(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  if (process.env.NODE_ENV !== 'development') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-96">
          <CardHeader>
            <CardTitle className="text-center text-red-600">Недоступно</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-center">Dev login доступен только в режиме разработки</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <Card className="w-96">
        <CardHeader>
          <CardTitle className="text-center text-2xl font-bold text-gray-800">
            🚀 Development Auto Login
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-center text-gray-600">
            Автоматический вход для разработки
          </p>
          
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-700 text-center">{error}</p>
            </div>
          )}
          
          <Button 
            onClick={handleDevLogin}
            disabled={isLoading}
            className="w-full"
            size="lg"
          >
            {isLoading ? 'Входим...' : '🔓 Войти как Developer'}
          </Button>
          
          <div className="text-xs text-gray-500 text-center">
            <p>Роль: Administrator</p>
            <p>Email: dev@planetenglish.ru</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
