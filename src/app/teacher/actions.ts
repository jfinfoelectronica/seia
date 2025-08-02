"use server";

import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';

// ... (otras acciones existentes)

export async function getTeacherDashboardStats() {
  const session = await auth();

  if (!session?.user?.id) {
    return {
      firstName: "Usuario",
      evaluationCount: 0,
      evaluationLimit: 0,
      activeSchedules: 0,
    };
  }
  
  const userId = parseInt(session.user.id);

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      firstName: true,
      evaluationLimit: true,
      _count: {
        select: {
          evaluations: true,
        }
      }
    }
  });

  if (!user) {
    throw new Error("Usuario no encontrado en la base de datos.");
  }
  
  const activeSchedules = await prisma.attempt.count({
    where: {
      evaluation: {
        authorId: user.id,
      },
      endTime: {
        gte: new Date(),
      }
    }
  });
  
  return {
    firstName: user.firstName,
    evaluationCount: user._count.evaluations,
    evaluationLimit: user.evaluationLimit,
    activeSchedules,
  };
}