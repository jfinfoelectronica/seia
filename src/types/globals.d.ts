export {}

// Create a type for the roles
export type Roles = 'ADMIN' | 'TEACHER'

// Extender los tipos de NextAuth
import { DefaultSession } from 'next-auth'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      role?: Roles;
    } & DefaultSession['user']
  }

  interface User {
    id: string | number; // Permitir number para compatibilidad con Prisma
    email: string;
    name?: string | null;
    role?: string | null; // Permitir string | null para compatibilidad con Prisma
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
    role?: Roles;
  }
}