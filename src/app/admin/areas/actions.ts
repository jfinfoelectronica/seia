"use server";
import { prisma } from '@/lib/prisma';

export async function getAreas() {
  return await prisma.area.findMany({ orderBy: { name: 'asc' } });
}

export async function createArea(name: string) {
  if (!name.trim()) return { error: 'El nombre es obligatorio.' };
  try {
    const area = await prisma.area.create({ data: { name } });
    return { area };
  } catch {
    return { error: 'No se pudo crear el área. ¿Ya existe?' };
  }
}

export async function updateArea(id: number, name: string) {
  if (!name.trim()) return { error: 'El nombre es obligatorio.' };
  try {
    const area = await prisma.area.update({ where: { id }, data: { name } });
    return { area };
  } catch {
    return { error: 'No se pudo actualizar el área.' };
  }
}

export async function deleteArea(id: number) {
  // Verificar si hay profesores asociados
  const users = await prisma.user.findMany({ where: { areaId: id } });
  if (users.length > 0) {
    return { error: 'No puedes eliminar un área con profesores asociados. Reasigna o elimina los profesores primero.' };
  }
  try {
    await prisma.area.delete({ where: { id } });
    return { success: true };
  } catch {
    return { error: 'No se pudo eliminar el área.' };
  }
} 