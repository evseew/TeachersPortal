"use client"

import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { Shield, Home, ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Suspense } from "react"

function AccessDeniedContent() {
  const searchParams = useSearchParams()
  const message = searchParams?.get("message") || "Недостаточно прав для доступа к этой странице"
  const userRole = searchParams?.get("role")
  const attemptedPath = searchParams?.get("attempted")

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center">
            <Shield className="w-8 h-8 text-red-600 dark:text-red-500" />
          </div>
          <CardTitle className="text-2xl font-bold text-foreground">
            Доступ запрещен
          </CardTitle>
        </CardHeader>
        
        <CardContent className="space-y-4 text-center">
          <p className="text-muted-foreground">
            {message}
          </p>
          
          {userRole && (
            <div className="text-sm text-muted-foreground bg-muted rounded-lg p-3">
              <p><strong>Ваша роль:</strong> {userRole}</p>
              {attemptedPath && (
                <p><strong>Запрошенная страница:</strong> {attemptedPath}</p>
              )}
            </div>
          )}
          
          <div className="space-y-2 pt-4">
            <Button asChild className="w-full">
              <Link href="/dashboard">
                <Home className="w-4 h-4 mr-2" />
                На главную
              </Link>
            </Button>
            
            <Button variant="outline" onClick={() => window.history.back()} className="w-full">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Назад
            </Button>
          </div>
          
          <p className="text-xs text-muted-foreground pt-4">
            Если вы считаете, что это ошибка, обратитесь к администратору системы.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

export default function AccessDeniedPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center space-y-4">
            <div className="mx-auto w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center">
              <Shield className="w-8 h-8 text-red-600 dark:text-red-500" />
            </div>
            <CardTitle className="text-2xl font-bold text-foreground">
              Загрузка...
            </CardTitle>
          </CardHeader>
        </Card>
      </div>
    }>
      <AccessDeniedContent />
    </Suspense>
  )
}
