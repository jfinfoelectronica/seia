"use server";

import { prisma } from "@/lib/prisma";

export async function getSystemActivityStats() {
  const [
    totalUsers,
    totalEvaluations,
    totalSchedules,
    totalSubmissions,
  ] = await prisma.$transaction([
    prisma.user.count(),
    prisma.evaluation.count(),
    prisma.attempt.count(),
    prisma.submission.count(),
  ]);

  return {
    totalUsers,
    totalEvaluations,
    totalSchedules,
    totalSubmissions,
  };
}

export interface TeacherActivity {
  id: string; // Clerk ID
  dbId: number; // DB ID
  firstName: string | null;
  lastName: string | null;
  email: string;
  evaluationCount: number;
  evaluationLimit: number;
}

export async function getTeacherActivityStats(): Promise<TeacherActivity[]> {
  // 1. Obtener los conteos de evaluaciones agrupados por autor
  const evaluationCounts = await prisma.evaluation.groupBy({
    by: ['authorId'],
    _count: {
      id: true,
    },
  });
  const countsMap = new Map(
    evaluationCounts.map(item => [item.authorId, item._count.id])
  );

  // 2. Obtener todos los usuarios con rol TEACHER directamente de la base de datos
  const teachers = await prisma.user.findMany({
    where: {
      role: 'TEACHER'
    },
    select: {
      id: true,
      evaluationLimit: true,
      firstName: true,
      lastName: true,
      email: true,
    },
  });

  // 3. Combinar los datos
  const teachersActivity = teachers.map(teacher => {
    const evaluationCount = countsMap.get(teacher.id) || 0;
    
    return {
      id: teacher.id.toString(),
      dbId: teacher.id,
      firstName: teacher.firstName,
      lastName: teacher.lastName,
      email: teacher.email || '',
      evaluationCount: evaluationCount,
      evaluationLimit: teacher.evaluationLimit,
    };
  }).sort((a, b) => b.evaluationCount - a.evaluationCount); // Ordenar por los más activos

  return teachersActivity;
}

export interface FraudReportStat {
  submissionId: number;
  studentName: string;
  evaluationTitle: string;
  attemptDate: Date;
  timeOutsideEval: number; // en segundos
}

export async function getFraudReportStats(): Promise<FraudReportStat[]> {
  const submissionsWithFraud = await prisma.submission.findMany({
    where: {
      timeOutsideEval: { gt: 0 },
    },
    include: {
      attempt: {
        include: {
          evaluation: {
            select: { title: true },
          },
        },
      },
    },
    orderBy: {
      submittedAt: 'desc',
    },
    take: 100, // Limitar a los 100 incidentes más recientes para no sobrecargar
  });

  return submissionsWithFraud.map(submission => ({
    submissionId: submission.id,
    studentName: `${submission.firstName} ${submission.lastName}`,
    evaluationTitle: submission.attempt.evaluation.title,
    attemptDate: submission.attempt.startTime,
    timeOutsideEval: submission.timeOutsideEval,
  }));
}

export interface ApiKeyConfigStats {
  isGlobalKeySet: boolean;
  teachersWithPermission: number;
  teachersWithPersonalKey: number;
  totalTeachers: number;
}

export async function getApiKeyConfigStats(): Promise<ApiKeyConfigStats> {
  // 1. Verificar la clave global
  const globalKey = await prisma.globalSettings.findFirst();
  const isGlobalKeySet = !!globalKey && globalKey.geminiApiKey.length > 0;

  // 2. Obtener todos los profesores directamente de la base de datos
  const dbTeachers = await prisma.user.findMany({
    where: {
      role: 'TEACHER'
    },
    select: {
      useGlobalApiKey: true,
      geminiApiKey: true,
    },
  });

  // 4. Calcular estadísticas
  const teachersWithPermission = dbTeachers.filter(t => t.useGlobalApiKey === false).length;
  const teachersWithPersonalKey = dbTeachers.filter(t => t.useGlobalApiKey === false && t.geminiApiKey && t.geminiApiKey.length > 0).length;

  return {
    isGlobalKeySet,
    teachersWithPermission,
    teachersWithPersonalKey,
    totalTeachers: dbTeachers.length,
  };
}

export interface EvaluationPerformanceStat {
  evaluationId: number;
  evaluationTitle: string;
  authorName: string;
  submissionCount: number;
  averageScore: number;
  passRate: number;
}

export async function getEvaluationPerformanceStats(): Promise<EvaluationPerformanceStat[]> {
  // 1. Obtener todas las sumisiones con puntaje, incluyendo datos de evaluación y autor
  const submissions = await prisma.submission.findMany({
    where: { score: { not: null } },
    select: {
      score: true,
      attempt: {
        select: {
          evaluation: {
            select: {
              id: true,
              title: true,
              author: {
                select: {
                  firstName: true,
                  lastName: true,
                },
              },
            },
          },
        },
      },
    },
  });

  // 2. Agrupar los puntajes por evaluación en un mapa
  const performanceMap = new Map<number, { title: string; authorName: string; scores: number[] }>();

  for (const sub of submissions) {
    if (sub.attempt?.evaluation) {
      const evalData = sub.attempt.evaluation;
      const { id, title, author } = evalData;
      const authorName = `${author.firstName || ''} ${author.lastName || ''}`.trim() || 'N/A';
      
      if (!performanceMap.has(id)) {
        performanceMap.set(id, { title, authorName, scores: [] });
      }
      performanceMap.get(id)!.scores.push(sub.score!);
    }
  }

  // 3. Calcular las estadísticas finales para cada evaluación
  const results: EvaluationPerformanceStat[] = [];
  for (const [evalId, data] of performanceMap.entries()) {
    const submissionCount = data.scores.length;
    if (submissionCount === 0) continue;

    const totalScore = data.scores.reduce((sum, score) => sum + score, 0);
    const averageScore = totalScore / submissionCount;
    const passCount = data.scores.filter(score => score >= 3.0).length;
    const passRate = (passCount / submissionCount) * 100;

    results.push({
      evaluationId: evalId,
      evaluationTitle: data.title,
      authorName: data.authorName,
      submissionCount,
      averageScore,
      passRate,
    });
  }

  // Ordenar por las de menor rendimiento para destacarlas
  return results.sort((a, b) => a.averageScore - b.averageScore);
}

export interface DifficultQuestionStat {
  questionId: number;
  questionText: string;
  evaluationTitle: string;
  answerCount: number;
  averageScore: number;
}

export async function getMostDifficultQuestions(take: number = 10): Promise<DifficultQuestionStat[]> {
  // 1. Agrupar respuestas por pregunta y calcular promedio y conteo
  const aggregatedAnswers = await prisma.answer.groupBy({
    by: ['questionId'],
    _avg: {
      score: true,
    },
    _count: {
      id: true,
    },
    where: {
      score: { not: null },
    },
    orderBy: {
      _avg: {
        score: 'asc',
      },
    },
    take,
  });

  if (aggregatedAnswers.length === 0) {
    return [];
  }

  // 2. Obtener los detalles de las preguntas más difíciles
  const questionIds = aggregatedAnswers.map(a => a.questionId);
  const questions = await prisma.question.findMany({
    where: {
      id: { in: questionIds },
    },
    select: {
      id: true,
      text: true,
      evaluation: {
        select: {
          title: true,
        },
      },
    },
  });
  const questionsMap = new Map(questions.map(q => [q.id, q]));

  // 3. Combinar los datos agregados con los detalles de la pregunta
  const results = aggregatedAnswers.map(agg => {
    const questionDetails = questionsMap.get(agg.questionId);
    return {
      questionId: agg.questionId,
      questionText: questionDetails?.text ?? 'Pregunta no encontrada',
      evaluationTitle: questionDetails?.evaluation.title ?? 'Evaluación no encontrada',
      answerCount: agg._count.id,
      averageScore: agg._avg.score ?? 0,
    };
  });
  
  return results;
}