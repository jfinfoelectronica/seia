'use server';

import { PrismaClient } from '@prisma/client';
import { auth } from '@/auth';
import { decrypt } from '@/lib/crypto';

const prisma = new PrismaClient();

/**
 * Obtiene la clave de API global encriptada y la devuelve desencriptada.
 * @returns La clave de API global o null si no está configurada.
 */
async function getGlobalApiKey(): Promise<string | null> {
  const settings = await prisma.globalSettings.findFirst();
  if (settings && settings.geminiApiKey) {
    try {
      return decrypt(settings.geminiApiKey);
    } catch (error) {
      console.error("Failed to decrypt global API key:", error);
      return null;
    }
  }
  return null;
}

/**
 * Determina la clave de API de Gemini correcta a utilizar.
 * - Si se proporciona un evaluationId, la clave se basa en el profesor que creó la evaluación.
 * - Si no, se basa en el usuario que está realizando la sesión (admin o profesor).
 * @param evaluationId - El ID opcional de la evaluación que se está procesando.
 * @returns La clave de API de Gemini que se debe usar.
 * @throws Si el usuario no está autenticado, no se encuentra o no hay una clave válida configurada.
 */
export async function getApiKey(evaluationId?: number): Promise<string> {
  // CASO 1: La clave se necesita en el contexto de una evaluación (ej. un estudiante respondiendo)
  if (evaluationId) {
    const evaluation = await prisma.evaluation.findUnique({
      where: { id: evaluationId },
      include: { author: true },
    });

    if (!evaluation || !evaluation.author) {
      throw new Error(`Evaluation or evaluation author not found for ID: ${evaluationId}`);
    }

    const professor = evaluation.author;

    if (professor.useGlobalApiKey) {
      const globalKey = await getGlobalApiKey();
      if (!globalKey) throw new Error('Global API Key is not configured for use.');
      return globalKey;
    } else {
      if (!professor.geminiApiKey) throw new Error(`Personal API Key for professor ${professor.id} is not configured.`);
      try {
        return decrypt(professor.geminiApiKey);
      } catch (error) {
        console.error(`Failed to decrypt personal API Key for professor ${professor.id}:`, error);
        throw new Error(`Failed to decrypt personal API Key for professor ${professor.id}.`);
      }
    }
  }

  // CASO 2: La clave se necesita fuera del contexto de una evaluación (ej. un profesor creando preguntas)
  const session = await auth();
  if (!session?.user?.id) throw new Error('User not authenticated.');

  const role = session.user.role;

  if (role === 'ADMIN') {
    const globalKey = await getGlobalApiKey();
    if (!globalKey) throw new Error('Global API Key is not configured.');
    return globalKey;
  }

  if (role === 'TEACHER') {
    const dbUser = await prisma.user.findUnique({ where: { id: parseInt(session.user.id) } });
    if (!dbUser) throw new Error('User not found in database.');

    if (dbUser.useGlobalApiKey) {
      const globalKey = await getGlobalApiKey();
      if (!globalKey) throw new Error('Global API Key is not configured for use.');
      return globalKey;
    } else {
      if (!dbUser.geminiApiKey) throw new Error('Personal API Key is not configured.');
      try {
        return decrypt(dbUser.geminiApiKey);
      } catch (error) {
        console.error(`Failed to decrypt personal API Key for user ${dbUser.id}:`, error);
        throw new Error(`Failed to decrypt personal API Key for user ${dbUser.id}.`);
      }
    }
  }
  
  throw new Error('User role is not authorized to use the API Key service.');
}