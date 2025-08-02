'use server';

import { PrismaClient } from '@prisma/client';
import { revalidatePath } from 'next/cache';
import { encrypt, decrypt } from '@/lib/crypto';

const prisma = new PrismaClient();

export async function getGlobalSettings() {
  const settings = await prisma.globalSettings.findFirst();
  if (settings && settings.geminiApiKey) {
    return {
      ...settings,
      geminiApiKey: decrypt(settings.geminiApiKey),
    };
  }
  return settings;
}

export async function updateGlobalApiKey(apiKey: string) {
  const encryptedApiKey = encrypt(apiKey);
  
  const existingSettings = await prisma.globalSettings.findFirst();

  if (existingSettings) {
    await prisma.globalSettings.update({
      where: { id: existingSettings.id },
      data: { geminiApiKey: encryptedApiKey },
    });
  } else {
    await prisma.globalSettings.create({
      data: { geminiApiKey: encryptedApiKey },
    });
  }

  revalidatePath('/admin/settings');
}

export async function updateUserApiKey(userId: number, apiKey: string | null) {
    if (apiKey) {
        const encryptedApiKey = encrypt(apiKey);
        await prisma.user.update({
            where: { id: userId },
            data: { geminiApiKey: encryptedApiKey, useGlobalApiKey: false },
        });
    } else {
        // Si la clave es nula o vacía, se elimina y se marca para usar la global.
        await prisma.user.update({
            where: { id: userId },
            data: { geminiApiKey: null, useGlobalApiKey: true },
        });
    }
    revalidatePath('/admin/users'); // O la ruta que sea apropiada
}

export async function updateUserUseGlobalKey(userId: number, useGlobal: boolean) {
    await prisma.user.update({
        where: { id: userId },
        data: { useGlobalApiKey: useGlobal },
    });
    revalidatePath('/admin/users'); // O la ruta que sea apropiada
}