import GoogleProvider from "next-auth/providers/google"
import CredentialsProvider from "next-auth/providers/credentials"
import type { NextAuthOptions } from "next-auth"

import { supabaseAdmin } from "@/lib/supabase/admin"
import { type UserRole } from "@/lib/constants/user-management"

const allowedDomain = "planetenglish.ru"

export const authOptions: NextAuthOptions = {
  providers: [
    // Development auto-login provider
    ...(process.env.NODE_ENV === 'development' ? [
      CredentialsProvider({
        id: "dev-auto-login",
        name: "Dev Auto Login",
        credentials: {},
        async authorize() {
          // Автоматически возвращаем тестового пользователя для разработки
          return {
            id: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
            email: "dev@planetenglish.ru",
            name: "Dev User",
            role: "Administrator"
          }
        }
      })
    ] : []),
    // Ваши реальные провайдеры для продакшена
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      const email = user?.email ?? ""
      if (!email) return false
      
      // Для dev провайдера в режиме разработки разрешаем вход без проверок
      if (process.env.NODE_ENV === 'development' && account?.provider === 'dev-auto-login') {
        console.log(`🚀 Dev auto-login для ${email}`)
        return true
      }
      
      // Проверяем домен
      const domain = email.split("@")[1]
      if (domain !== allowedDomain) return false
      
      // Проверяем, существует ли пользователь в базе портала
      try {
        const { data: profile } = await supabaseAdmin
          .from('profiles')
          .select('user_id')
          .eq('email', email)
          .single()
        
        // Разрешаем вход только если пользователь существует в базе
        return !!profile
      } catch (error) {
        console.log(`Вход запрещен: пользователь ${email} не найден в базе портала`)
        return false
      }
    },
    async session({ session, token }) {
      if (session?.user && token?.email) {
        session.user.email = token.email as string

        // Для dev пользователя в development режиме всегда Administrator
        if (process.env.NODE_ENV === 'development' && token.email === 'dev@planetenglish.ru') {
          session.user.role = 'Administrator'
          console.log(`🔍 Dev пользователь ${token.email} получает роль: Administrator`)
        } else {
          // Для остальных провайдеров используем роль из токена или БД
          if (token.role && typeof token.role === 'string') {
            session.user.role = token.role as UserRole
          } else {
            // Для OAuth провайдеров получаем роль из БД через profiles_with_role view
            try {
              const { data: profile } = await supabaseAdmin
                .from('profiles_with_role')
                .select('role')
                .eq('email', token.email)
                .single()

              if (profile) {
                session.user.role = profile.role
                console.log(`🔍 Пользователь ${token.email} получил роль из БД: ${profile.role}`)
              } else {
                // Если профиль не найден, устанавливаем Regular User
                session.user.role = 'Regular User'
                console.log(`⚠️ Профиль не найден для ${token.email}, устанавливаем Regular User`)
              }
            } catch (error) {
              console.error("Ошибка получения роли:", error)
              // Если не удалось получить роль, устанавливаем Regular User по умолчанию
              session.user.role = 'Regular User'
              console.log(`⚠️ Ошибка получения роли для ${token.email}, устанавливаем Regular User`)
            }
          }
        }
      }
      return session
    },
    async jwt({ token, account, profile, user }) {
      // Для credentials provider (dev-auto-login) данные приходят в user
      if (user?.email) {
        token.email = user.email
        // Устанавливаем роль в токен для всех пользователей
        // Для dev пользователя роль будет Administrator из credentials provider
        token.role = user.role
      }

      // Для OAuth providers данные приходят в profile
      if (profile && (profile as any).email) {
        token.email = (profile as any).email
      }

      return token
    },
  },
  events: {
    async signIn(message) {
      const email = message.user?.email ?? ""
      console.log(`✅ Успешный вход пользователя: ${email}`)
    },
  },
  pages: {
    signIn: '/auth/login',
    error: '/auth/error',
  },
  session: {
    strategy: "jwt",
  },
}

export default authOptions


