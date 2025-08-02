"use server";

import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { User as PrismaUser, Prisma } from '@prisma/client';
import { hash } from 'bcrypt';

export interface DisplayUser extends PrismaUser {
  role: string | null;
  email: string;
}

export async function getUsers(): Promise<{ users: DisplayUser[]; error?: string }> {
  try {
    // En lugar de obtener usuarios de Clerk, los obtenemos directamente de la base de datos
    const dbUsers = await prisma.user.findMany({
      include: {
        accounts: true
      }
    });

    // Transformamos los usuarios para mantener la misma estructura de datos
    const combinedUsers = dbUsers.map((dbUser): DisplayUser => {
      return {
        ...dbUser,
        email: dbUser.email || '',
        role: dbUser.role,
      };
    });

    return { users: combinedUsers };
  } catch (error) {
    console.error('Error fetching users:', error);
    if (error instanceof Error) {
        return { users: [], error: error.message };
    }
    return { users: [], error: 'No se pudieron cargar los usuarios.' };
  }
}

interface CreateTeacherPayload {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  identification: string;
  areaId: number | null;
}

export async function createTeacher(payload: CreateTeacherPayload) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== 'ADMIN') {
      return { success: false, error: 'No tienes permisos para crear profesores.' };
    }

    const { email, password, firstName, lastName, identification, areaId } = payload;

    // Validar que todos los campos requeridos estén presentes
    if (!email || !password || !firstName || !lastName || !identification) {
      return { success: false, error: 'Todos los campos son obligatorios.' };
    }

    // Verificar que el email no esté en uso
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      return { success: false, error: 'El email ya está en uso.' };
    }

    // Hash de la contraseña
    const hashedPassword = await hash(password, 12);

    // Crear el usuario profesor
    const newTeacher = await prisma.user.create({
      data: {
        email,
        hashedPassword,
        firstName,
        lastName,
        name: `${firstName} ${lastName}`,
        identification,
        role: 'TEACHER', // Aseguramos que el rol sea exactamente 'TEACHER'
        areaId,
        useGlobalApiKey: false,
        evaluationLimit: 5, // Límite por defecto para profesores
      }
    });
    
    // Verificar que el rol se haya guardado correctamente
    if (newTeacher.role !== 'TEACHER') {
      console.error('Error: El rol del profesor no se guardó correctamente', {
        expectedRole: 'TEACHER',
        actualRole: newTeacher.role
      });
      
      // Intentar actualizar el rol si no se guardó correctamente
      await prisma.user.update({
        where: { id: newTeacher.id },
        data: { role: 'TEACHER' }
      });
    }

    // Log de depuración para verificar que el usuario se creó correctamente
    console.log('Teacher created successfully:', {
      id: newTeacher.id,
      email: newTeacher.email,
      role: newTeacher.role,
      firstName: newTeacher.firstName,
      lastName: newTeacher.lastName
    });

    revalidatePath('/admin/users');
    return { 
      success: true, 
      message: `Profesor ${firstName} ${lastName} creado exitosamente.`,
      userId: newTeacher.id 
    };

  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        return { success: false, error: 'El email o identificación ya están en uso.' };
      }
    }
    console.error('Error creating teacher:', error);
    if (error instanceof Error) return { success: false, error: error.message };
    return { success: false, error: 'No se pudo crear el profesor.' };
  }
}

export async function deleteUser(userId: string) {
  try {
    await prisma.user.delete({ where: { id: Number(userId) } });
    revalidatePath('/admin/users');
    return { success: true };
  } catch (error) {
    console.error('Error deleting user:', error);
    if (error instanceof Error) return { success: false, error: error.message };
    return { success: false, error: 'No se pudo eliminar el usuario.' };
  }
}

export async function updateUserArea(userId: string, areaId: number | null) {
  try {
    await prisma.user.update({ where: { id: Number(userId) }, data: { areaId } });
    revalidatePath('/admin/users');
    return { success: true };
  } catch (error) {
    console.error('Error updating user area:', error);
    if (error instanceof Error) return { success: false, error: error.message };
    return { success: false, error: 'No se pudo actualizar el área del usuario.' };
  }
}

export async function getAreas() {
  return await prisma.area.findMany({ orderBy: { name: 'asc' } });
}

// Función de depuración para verificar el estado de un usuario
export async function debugUser(email: string) {
  try {
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        area: true,
        accounts: true,
        sessions: true
      }
    });
    
    console.log('Debug user:', user);
    return user;
  } catch (error) {
    console.error('Error debugging user:', error);
    return null;
  }
}

interface UpdateUserPayload {
  id: string;
  firstName: string;
  lastName: string;
  areaId: number | null;
  identification: string | null;
  useGlobalApiKey?: boolean;
  evaluationLimit?: number;
}

export async function updateUserFull(payload: UpdateUserPayload) {
  const { id, firstName, lastName, areaId, identification, useGlobalApiKey, evaluationLimit } = payload;
  const userToUpdate = await prisma.user.findUnique({
    where: { id: Number(id) }
  });

  if (!userToUpdate) {
    return { success: false, error: 'Usuario no encontrado' };
  }
  
  try {
    const dataToUpdate: {
      firstName: string;
      lastName: string;
      areaId: number | null;
      identification: string | null;
      useGlobalApiKey?: boolean;
      evaluationLimit?: number;
    } = {
      firstName,
      lastName,
      areaId,
      identification,
    };

    if (useGlobalApiKey !== undefined) {
      dataToUpdate.useGlobalApiKey = useGlobalApiKey;
    }
    if (evaluationLimit !== undefined) {
      dataToUpdate.evaluationLimit = evaluationLimit;
    }

    await prisma.user.update({
      where: { id: Number(id) },
      data: dataToUpdate,
    });
    revalidatePath('/admin/users');
    return { success: true };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        return { success: false, error: 'La identificación ingresada ya pertenece a otro usuario.' };
      }
    }
    console.error('Error al actualizar usuario:', error);
    if (error instanceof Error) return { success: false, error: error.message };
    return { success: false, error: 'Ocurrió un error al actualizar el usuario.' };
  }
}

interface ProfileData {
  firstName: string;
  lastName: string;
  identification: string;
}

export async function updateCurrentUserProfile(data: ProfileData) {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: 'Usuario no autenticado.' };
  }
  const userId = parseInt(session.user.id);

  if (!data.firstName || !data.lastName || !data.identification) {
      return { success: false, error: 'Todos los campos son obligatorios.' };
  }

  try {
    await prisma.user.update({
      where: { id: userId },
      data: {
        firstName: data.firstName.trim(),
        lastName: data.lastName.trim(),
        identification: data.identification.trim(),
      },
    });
    
    revalidatePath('/', 'layout'); 

    return { success: true };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        return { success: false, error: 'La identificación ingresada ya está en uso. Por favor, utilice otra.' };
      }
    }
    if (error instanceof Error) {
        return { success: false, error: error.message };
    }
    return { success: false, error: 'No se pudo actualizar el perfil. Inténtelo de nuevo.' };
  }
}