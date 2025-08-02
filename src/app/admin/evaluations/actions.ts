"use server";
import { prisma } from "@/lib/prisma";

export async function getTeachers() {
  // Obtiene todos los usuarios de la base de datos con rol TEACHER
  const teachers = await prisma.user.findMany({
    where: { role: 'TEACHER' },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true
    }
  });
  
  return teachers.map((teacher) => ({
    id: teacher.id.toString(),
    firstName: teacher.firstName,
    lastName: teacher.lastName,
    email: teacher.email
  }));
}

export async function getEvaluations(teacherId?: number) {
  return prisma.evaluation.findMany({
    where: teacherId ? { authorId: teacherId } : {},
    include: {
      author: {
        select: {
          firstName: true,
          lastName: true,
          email: true,
          area: { select: { name: true } }
        }
      },
      _count: { select: { attempts: true } }
    },
    orderBy: { createdAt: "desc" }
  });
}

export async function deleteEvaluation(evaluationId: number) {
  await prisma.evaluation.delete({ where: { id: evaluationId } });
  // revalidatePath("/admin/evaluations");
}

export async function getPreguntasByEvaluacion(evaluationId: number) {
  return await prisma.question.findMany({
    where: { evaluationId },
    orderBy: { createdAt: 'asc' },
  });
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function createPregunta(_evaluationId: number, _data: { text: string; type: string; language?: string; }) {
  return {};
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function updatePregunta(_id: number, _data: { text?: string; type?: string; language?: string; }) {
  return {};
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function deletePregunta(_id: number) {
  return {};
}

// NUEVO: Obtener evaluación completa con preguntas
export async function getEvaluacionCompleta(id: number) {
  return await prisma.evaluation.findUnique({
    where: { id },
    include: {
      questions: {
        orderBy: { createdAt: 'asc' },
      },
    },
  });
}