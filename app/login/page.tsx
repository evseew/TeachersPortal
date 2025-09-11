"use client"

import type React from "react"
import { useState } from "react"
import { AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { signIn } from "next-auth/react"

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")

  const handleGoogleSignIn = async () => {
    setIsLoading(true)
    setError("")
    try {
      const enabled = process.env.NEXT_PUBLIC_AUTH_ENABLED === "true"
      if (!enabled) {
        setError("Auth отключена локально. Продолжайте без входа.")
        setIsLoading(false)
        return
      }
      await signIn("google", { callbackUrl: "/september-rating" })
    } catch (err) {
      setError("Sign-in failed. Please ensure you're using a @planetenglish.ru account.")
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-green-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex items-center justify-center mb-8">
          <div className="w-20 h-20 bg-[#7A9B28] rounded-xl flex items-center justify-center mr-4 shadow-lg">
            <span className="text-white font-bold text-3xl">PE</span>
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">PlanetEnglish</h1>
            <p className="text-lg text-gray-600">Portal</p>
          </div>
        </div>

        {/* Form Card */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Добро пожаловать</h2>
            <p className="text-gray-600">Войдите в систему для доступа к порталу</p>
          </div>

          <div className="space-y-6">
            <Button
              onClick={handleGoogleSignIn}
              disabled={isLoading}
              className="w-full bg-white hover:bg-gray-50 text-gray-900 border border-gray-300 shadow-sm h-12"
            >
              <div className="flex items-center justify-center space-x-3">
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                <span className="font-medium">{isLoading ? "Вход..." : "Войти через Google"}</span>
              </div>
            </Button>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm text-blue-800 font-medium mb-1">Ограниченный доступ</p>
                  <p className="text-sm text-blue-700">
                    Доступ разрешен только для аккаунтов <strong>@planetenglish.ru</strong>
                  </p>
                </div>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              </div>
            )}

            <div className="text-center pt-4">
              <p className="text-sm text-gray-600">
                Нужна помощь с доступом?{" "}
                <a href="mailto:admin@planetenglish.ru" className="text-[#7A9B28] hover:text-[#5A7020] font-medium">
                  Обратитесь к администратору
                </a>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
