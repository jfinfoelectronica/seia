import { Roles } from '@/types/globals'
import { auth } from '@/auth'

export const checkRole = async (role: Roles) => {
  const session = await auth()
  return session?.user?.role === role
}