import NextAuth from "next-auth"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { prisma } from "@/lib/prisma"
import type { NextAuthConfig } from "next-auth"
import Credentials from "next-auth/providers/credentials"
import Google from "next-auth/providers/google"
import { compare } from "bcrypt"
import type { Roles } from "@/types/globals"

export const authConfig = {
  adapter: PrismaAdapter(prisma),
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Contraseña", type: "password" }
      },
      async authorize(credentials: Record<string, unknown> | undefined) {
        if (!credentials?.email || !credentials?.password) return null
        
        const email = credentials.email as string;
        const password = credentials.password as string;
        
        try {
          const user = await prisma.user.findUnique({
            where: { email: email },
          })

          if (!user || !user.hashedPassword) return null
          
          const isPasswordValid = await compare(password, user.hashedPassword);
          
          if (!isPasswordValid) return null;
          
          return {
            id: user.id.toString(),
            email: user.email,
            name: user.name,
            role: user.role,
          }
        } catch (error) {
          console.error('Auth error:', error);
          return null;
        }
      }
    })
  ],
  callbacks: {
    async session({ session, token }) {
      if (token.sub && session.user) {
        session.user.id = token.sub
        
        try {
          const user = await prisma.user.findUnique({
            where: { id: parseInt(token.sub) },
          })
          
          if (user) {
            const userRole = user.role;
            if (userRole === 'ADMIN' || userRole === 'TEACHER') {
              session.user.role = userRole as Roles;
            }
          }
        } catch (error) {
          console.error('Session callback error:', error);
        }
      }
      return session
    },
    async jwt({ token, user }) {
      if (user) {
        const userRole = user.role;
        if (userRole === 'ADMIN' || userRole === 'TEACHER') {
          token.role = userRole as Roles;
        }
      }
      return token
    },
    async redirect({ url, baseUrl }) {
      // Permite redirecciones relativas o al mismo dominio
      if (url.startsWith("/")) return `${baseUrl}${url}`
      // Permite redirecciones al mismo dominio
      else if (new URL(url).origin === baseUrl) return url
      return baseUrl
    }
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 días
  },
  cookies: {
    sessionToken: {
      name: process.env.NODE_ENV === 'production' ? '__Secure-next-auth.session-token' : 'next-auth.session-token',
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
        // Removemos el domain específico para evitar problemas con el cierre de sesión
      },
    },
    callbackUrl: {
      name: process.env.NODE_ENV === 'production' ? '__Secure-next-auth.callback-url' : 'next-auth.callback-url',
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
      },
    },
    csrfToken: {
      name: process.env.NODE_ENV === 'production' ? '__Host-next-auth.csrf-token' : 'next-auth.csrf-token',
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
      },
    },
  },
  secret: process.env.AUTH_SECRET,
  trustHost: true, // Importante para Vercel
  debug: process.env.NODE_ENV === 'development',
} satisfies NextAuthConfig

export const { handlers, signIn, signOut, auth } = NextAuth(authConfig)