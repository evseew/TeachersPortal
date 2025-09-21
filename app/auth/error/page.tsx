"use client"

import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { AlertTriangle, Home, ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Suspense } from "react"

function AuthErrorContent() {
  const searchParams = useSearchParams()
  const error = searchParams?.get("error")

  const getErrorMessage = (errorType: string | null | undefined) => {
    switch (errorType) {
      case "Configuration":
        return "Ошибка конфигурации сервера."
      case "AccessDenied":
        return "Доступ запрещен. Убедитесь, что используете аккаунт @planetenglish.ru"
      case "Verification":
        return "Ошибка верификации. Попробуйте войти снова."
      case "Default":
      default:
        return "Произошла ошибка при входе в систему."
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-red-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
            <AlertTriangle className="w-8 h-8 text-red-600" />
          </div>
          <CardTitle className="text-2xl font-bold text-foreground">
            Ошибка входа
          </CardTitle>
        </CardHeader>
        
        <CardContent className="space-y-4 text-center">
          <p className="text-muted-foreground">
            {getErrorMessage(error)}
          </p>
          
          {error && (
            <div className="text-sm text-muted-foreground bg-muted rounded-lg p-3">
              <p><strong>Код ошибки:</strong> {error}</p>
            </div>
          )}
          
          <div className="space-y-2 pt-4">
            <Button asChild className="w-full">
              <Link href="/auth/login">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Попробовать снова
              </Link>
            </Button>
            
            <Button variant="outline" asChild className="w-full">
              <Link href="/">
                <Home className="w-4 h-4 mr-2" />
                На главную
              </Link>
            </Button>
          </div>
          
          <p className="text-xs text-muted-foreground pt-4">
            Если проблема повторяется, обратитесь к{" "}
            <a href="mailto:admin@planetenglish.ru" className="text-[#7A9B28] hover:text-[#5A7020] font-medium">
              администратору системы
            </a>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

export default function AuthErrorPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-red-100 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center space-y-4">
            <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
              <AlertTriangle className="w-8 h-8 text-red-600" />
            </div>
            <CardTitle className="text-2xl font-bold text-foreground">
              Загрузка...
            </CardTitle>
          </CardHeader>
        </Card>
      </div>
    }>
      <AuthErrorContent />
    </Suspense>
  )
}
