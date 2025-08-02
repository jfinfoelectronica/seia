"use server";

// import { generateQuestion } from '@/lib/gemini-question-generation';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

async function getUserFromSession() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Usuario no autenticado");
  
  const user = await prisma.user.findUnique({ where: { id: parseInt(session.user.id) } });
  if (!user) throw new Error("Usuario no encontrado en la base de datos");
  
  return user;
}

export async function getTeacherEvaluationStats() {
  const user = await getUserFromSession();
  const evaluationCount = await prisma.evaluation.count({
    where: { authorId: user.id },
  });
  return {
    evaluationLimit: user.evaluationLimit,
    evaluationCount: evaluationCount,
  };
}

export async function getEvaluaciones() {
  const user = await getUserFromSession();

  // El middleware ya protege esta ruta, solo los profesores pueden acceder.
  // Por lo tanto, solo devolvemos las evaluaciones del profesor actual.
  return await prisma.evaluation.findMany({
    where: { authorId: user.id },
    orderBy: { createdAt: 'desc' },
    include: {
      author: true,
    },
  });
}

export async function createEvaluacion(data: { title: string; description?: string; helpUrl?: string }) {
  const user = await getUserFromSession();

  const evaluationCount = await prisma.evaluation.count({
    where: { authorId: user.id },
  });

  if (evaluationCount >= user.evaluationLimit) {
    throw new Error("Has alcanzado tu límite de evaluaciones. Contacta a un administrador para aumentarlo.");
  }
  
  return await prisma.evaluation.create({
    data: {
      ...data,
      authorId: user.id,
    },
  });
}

export async function updateEvaluacion(id: number, data: { title?: string; description?: string; helpUrl?: string }) {
  const user = await getUserFromSession();
  const evaluation = await prisma.evaluation.findUnique({
    where: { id },
  });

  // Un profesor solo puede editar sus propias evaluaciones.
  if (evaluation?.authorId !== user.id) {
    throw new Error("No tienes permiso para editar esta evaluación");
  }

  return await prisma.evaluation.update({
    where: { id },
    data,
  });
}

export async function deleteEvaluacion(id: number) {
  const user = await getUserFromSession();
  const evaluation = await prisma.evaluation.findUnique({ where: { id } });

  // Un profesor solo puede eliminar sus propias evaluaciones.
  if (evaluation?.authorId !== user.id) {
    throw new Error("No tienes permiso para eliminar esta evaluación");
  }

  return await prisma.evaluation.delete({
    where: { id },
  });
}

// Función para obtener una evaluación completa con sus preguntas
export async function getEvaluacionCompleta(id: number) {
  const evaluacion = await prisma.evaluation.findUnique({
    where: { id },
    include: {
      questions: {
        orderBy: { createdAt: 'asc' },
      },
    },
  });
  return evaluacion;
}

// Función para importar una evaluación completa
export async function importEvaluacion(data: {
  title: string;
  description?: string;
  helpUrl?: string;
  questions: Array<{
    text: string;
    type: string;
    language?: string;
  }>;
}) {
  const user = await getUserFromSession();

  const evaluationCount = await prisma.evaluation.count({
    where: { authorId: user.id },
  });

  if (evaluationCount >= user.evaluationLimit) {
    throw new Error("Has alcanzado tu límite de evaluaciones. Contacta a un administrador para aumentarlo.");
  }
  
  return await prisma.evaluation.create({
    data: {
      title: data.title,
      description: data.description,
      helpUrl: data.helpUrl,
      authorId: user.id,
      questions: {
        create: data.questions,
      },
    },
    include: {
      questions: true,
    },
  });
}

// Preguntas CRUD
export async function getPreguntasByEvaluacion(evaluationId: number) {
  return await prisma.question.findMany({
    where: { evaluationId },
    orderBy: { createdAt: 'asc' },
  });
}

export async function createPregunta(evaluationId: number, data: { text: string; type: string; language?: string; }) {
  return await prisma.question.create({
    data: {
      evaluationId,
      ...data,
    },
  });
}

export async function updatePregunta(id: number, data: { text?: string; type?: string; language?: string; }) {
  return await prisma.question.update({
    where: { id },
    data,
  });
}

export async function deletePregunta(id: number) {
  return await prisma.question.delete({
    where: { id },
  });
}