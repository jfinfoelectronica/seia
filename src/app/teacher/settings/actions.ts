'use server';

import { PrismaClient } from '@prisma/client';
import { revalidatePath } from 'next/cache';
import { auth } from '@/auth';
import { encrypt, decrypt } from '@/lib/crypto';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

// Obtener la información del usuario actual
export async function getCurrentUser() {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error('Not authenticated');
  }
  
  const userId = parseInt(session.user.id);

  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (user && user.geminiApiKey) {
    return {
      ...user,
      geminiApiKey: decrypt(user.geminiApiKey),
    };
  }

  return user;
}

// Actualizar perfil del usuario
export async function updateTeacherProfile(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error('Not authenticated');
  }
  
  const userId = parseInt(session.user.id);

  const firstName = formData.get('firstName') as string;
  const lastName = formData.get('lastName') as string;
  const identification = formData.get('identification') as string;

  await prisma.user.update({
    where: { id: userId },
    data: {
      firstName,
      lastName,
      identification,
    },
  });

  revalidatePath('/teacher/settings');
}

// Actualizar la API Key de Gemini del usuario
export async function updateTeacherApiKey(formData: FormData) {
    const session = await auth();
    if (!session?.user?.id) {
      throw new Error('Not authenticated');
    }
    
    const userId = parseInt(session.user.id);
    
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.useGlobalApiKey) {
        throw new Error('Permission denied to update API key.');
    }
  
    const apiKey = formData.get('geminiApiKey') as string;
    const useGlobal = !apiKey;
  
    await prisma.user.update({
      where: { id: userId },
      data: {
        geminiApiKey: apiKey ? encrypt(apiKey) : null,
        useGlobalApiKey: useGlobal,
      },
    });
  
    revalidatePath('/teacher/settings');
  }

// Cambiar contraseña del usuario
export async function changePassword(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error('Not authenticated');
  }
  
  const userId = parseInt(session.user.id);
  
  const currentPassword = formData.get('currentPassword') as string;
  const newPassword = formData.get('newPassword') as string;
  const confirmPassword = formData.get('confirmPassword') as string;

  // Validar que las contraseñas coincidan
  if (newPassword !== confirmPassword) {
    throw new Error('Las contraseñas nuevas no coinciden');
  }

  // Validar longitud mínima
  if (newPassword.length < 6) {
    throw new Error('La contraseña debe tener al menos 6 caracteres');
  }

  // Obtener el usuario actual
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new Error('Usuario no encontrado');
  }

  // Verificar la contraseña actual
  const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.hashedPassword || '');
  if (!isCurrentPasswordValid) {
    throw new Error('La contraseña actual es incorrecta');
  }

  // Hashear la nueva contraseña
  const hashedNewPassword = await bcrypt.hash(newPassword, 10);

  // Actualizar la contraseña en la base de datos
  await prisma.user.update({
    where: { id: userId },
    data: {
      hashedPassword: hashedNewPassword,
    },
  });

  revalidatePath('/teacher/settings');
  return { success: true, message: 'Contraseña actualizada correctamente' };
}