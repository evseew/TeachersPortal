import { redirect } from "next/navigation"

export default function Home() {
  // Перенаправляем на dev-login для разработки, или на обычный логин для продакшена
  if (process.env.NODE_ENV === 'development') {
    redirect("/devlogin")
  } else {
    redirect("/auth/login")
  }
}
