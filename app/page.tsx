import { redirect } from "next/navigation"

export default function Home() {
  // Проверяем, отключена ли авторизация
  const authEnabled = process.env.NEXT_PUBLIC_AUTH_ENABLED === "true"
  
  if (!authEnabled) {
    // Если авторизация отключена, перенаправляем на дашборд
    redirect("/dashboard")
  } else {
    // Если авторизация включена, перенаправляем на страницу входа
    redirect("/auth/login")
  }
}
