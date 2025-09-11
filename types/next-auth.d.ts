import { type UserRole } from "@/lib/constants/user-management"
import "next-auth"

declare module "next-auth" {
  interface Session {
    user: {
      email: string
      name?: string | null
      image?: string | null
      role?: UserRole
    }
  }

  interface User {
    email: string
    name?: string | null
    image?: string | null
    role?: UserRole
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    email?: string
    role?: UserRole
  }
}
