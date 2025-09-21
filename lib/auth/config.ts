import GoogleProvider from "next-auth/providers/google"
import CredentialsProvider from "next-auth/providers/credentials"
import type { NextAuthOptions } from "next-auth"

import { supabaseAdmin } from "@/lib/supabase/admin"

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
        
        // Для dev провайдера роль уже сохранена в токене
        if (token.role) {
          session.user.role = token.role as string
        } else {
          // Для OAuth провайдеров получаем роль из БД
          try {
            const { data: profile } = await supabaseAdmin
              .from('profiles')
              .select('role')
              .eq('email', token.email)
              .single()
            
            if (profile) {
              session.user.role = profile.role
            }
          } catch (error) {
            console.error("Ошибка получения роли:", error)
            // Если не удалось получить роль, оставляем undefined
          }
        }
      }
      return session
    },
    async jwt({ token, account, profile, user }) {
      // Для credentials provider (dev-auto-login) данные приходят в user
      if (user?.email) {
        token.email = user.email
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


