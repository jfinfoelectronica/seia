'use server';


import { revalidatePath } from 'next/cache';
import { nowUTC, isBeforeUTC, isAfterUTC } from '@/lib/date-utils';
import { prisma } from '@/lib/prisma';
import { cookies as nextCookies } from 'next/headers';
import { randomUUID } from 'crypto';

// Eliminar esta línea ya que ahora importamos prisma desde lib/prisma.ts
// const prisma = new PrismaClient();

// Tipo para las respuestas del estudiante
type StudentAnswer = {
  questionId: number;
  answer: string;
  score?: number | null;
  evaluated: boolean;
};

/**
 * Obtiene los datos de un intento de evaluación por su código único
 */
export async function getAttemptByUniqueCode(uniqueCode: string, email?: string) {
  try {
    // Validar que el código no esté vacío
    if (!uniqueCode || uniqueCode.trim() === '') {
      return { success: false, error: 'El código de evaluación no puede estar vacío' };
    }

    // Validar el formato del código (asumiendo que debe tener al menos 6 caracteres)
    if (uniqueCode.trim().length < 6) {
      return { success: false, error: 'El código de evaluación debe tener al menos 6 caracteres' };
    }

    // Buscar el intento por su código único
    const attempt = await prisma.attempt.findUnique({
      where: { uniqueCode },
      include: {
        evaluation: {
          include: {
            questions: true
          }
        },
        submissions: email ? {
          where: {
            email: email,
            submittedAt: { not: null } // Buscar presentaciones ya enviadas para este email
          },
          take: 1
        } : undefined
      }
    });

    if (!attempt) {
      return { success: false, error: 'Código de evaluación no válido o no encontrado' };
    }

    // Verificar si ya existe una presentación enviada para este estudiante específico
    if (email && attempt.submissions && attempt.submissions.length > 0) {
      return { 
        success: false, 
        error: 'Esta evaluación ya fue enviada anteriormente. No es posible presentarla nuevamente.',
        alreadySubmitted: true
      };
    }

    // Verificar si el intento está dentro del tiempo permitido
    const now = nowUTC();
    if (isBeforeUTC(now, attempt.startTime)) {
      return { success: false, error: 'La evaluación aún no ha comenzado' };
    }

    if (isAfterUTC(now, attempt.endTime)) {
      return { success: false, error: 'La evaluación ya ha finalizado' };
    }

    // Asegurarse de que todos los campos necesarios estén incluidos en la respuesta
    // Especialmente el campo helpUrl que es requerido por el componente
    return { 
      success: true, 
      attempt,
      evaluation: {
        ...attempt.evaluation,
        helpUrl: attempt.evaluation.helpUrl || null
      }
    };
  } catch (error) {
    console.error('Error al obtener el intento:', error);
    return { success: false, error: 'Error al obtener los datos de la evaluación. Por favor, intenta nuevamente.' };
  }
}

/**
 * Crea una nueva presentación (submission) para un estudiante o recupera una existente
 */
export async function createSubmission(attemptId: number, email: string, firstName: string, lastName: string) {
  try {
    // Obtener o generar deviceId desde cookie HttpOnly
    const cookies = await nextCookies();
    let deviceId = cookies.get('deviceId')?.value;
    if (!deviceId) {
      deviceId = randomUUID();
      cookies.set('deviceId', deviceId, { httpOnly: true, sameSite: 'lax', path: '/', maxAge: 60 * 60 * 24 * 30 }); // 30 días
    }
    // Verificar si ya existe una submission para este intento, deviceId Y email
    const existingByDeviceAndEmail = await prisma.submission.findFirst({
      where: {
        attemptId,
        deviceId,
        email,
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
    if (existingByDeviceAndEmail) {
      // Si ya existe una submission para este deviceId y email, devolverla
      if (existingByDeviceAndEmail.submittedAt !== null) {
        return {
          success: false,
          error: 'Esta evaluación ya fue enviada desde este dispositivo para este usuario.'
        };
      }
      return { success: true, submission: existingByDeviceAndEmail };
    }

    // Verificar si ya existe una submission para este intento y email (pero con otro deviceId)
    const existingByEmail = await prisma.submission.findFirst({
      where: {
        attemptId,
        email,
        deviceId: { not: deviceId },
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
    if (existingByEmail) {
      // Si ya existe una submission para este email pero con otro deviceId, rechazar
      return {
        success: false,
        error: 'No puedes abrir la evaluación desde otro dispositivo o navegador. Debes continuar en el mismo lugar donde la iniciaste.'
      };
    }

    // Si no existe, creamos una nueva presentación
    const submission = await prisma.submission.create({
      data: {
        attemptId,
        firstName,
        lastName,
        email,
        deviceId,
        submittedAt: null // Se actualizará cuando se envíe completamente
      }
    });

    return { success: true, submission };
  } catch (error) {
    console.error('Error al crear la presentación:', error);
    return { success: false, error: 'Error al iniciar la evaluación' };
  }
}

/**
 * Guarda o actualiza una respuesta individual
 * Si score está definido, guarda la respuesta completa (evaluación con Gemini)
 * Si score no está definido, solo actualiza el contador de tiempo
 * Optimizado para reducir peticiones a la base de datos
 */
export async function saveAnswer(submissionId: number, questionId: number, answerText: string, score?: number | undefined, timeOutsideEval?: number | undefined) {
  try {
    // Preparar operaciones a realizar
    const operations = [];
    let answer;
    
    // Operación 1: Guardar/actualizar la respuesta si hay una calificación
    if (score !== undefined) {
      // Primero buscamos si existe la respuesta
      const existingAnswerPromise = prisma.answer.findFirst({
        where: {
          submissionId,
          questionId
        },
        select: { id: true }
      });
      
      operations.push(
        existingAnswerPromise.then(async (existingAnswer) => {
          if (existingAnswer) {
            // Si existe, actualizamos
            answer = await prisma.answer.update({
              where: { id: existingAnswer.id },
              data: {
                answer: answerText,
                score: score
              }
            });
          } else {
            // Si no existe, creamos
            answer = await prisma.answer.create({
              data: {
                submissionId,
                questionId,
                answer: answerText,
                score
              }
            });
          }
          return answer;
        })
      );
    }
    
    // Operación 2: Actualizar contador de tiempo si se proporcionó
    if (timeOutsideEval !== undefined) {
      operations.push(
        prisma.submission.update({
          where: { id: submissionId },
          data: {
            // Si se proporcionó valor, lo usamos directamente
            timeOutsideEval: timeOutsideEval
          }
        })
      );
    }

    // Ejecutar todas las operaciones en paralelo
    if (operations.length > 0) {
      await Promise.all(operations);
    }
    
    // Calcular y actualizar el promedio de calificaciones si se proporcionó una calificación
    if (score !== undefined) {
      await updateSubmissionScore(submissionId);
    }

    return { success: true, answer };
  
  } catch (error) {
    console.error('Error al guardar la respuesta:', error);
    return { success: false, error: 'Error al guardar la respuesta' };
  }
}

/**
 * Obtiene todas las respuestas guardadas para una presentación
 */
export async function getAnswersBySubmissionId(submissionId: number) {
  try {
    const answers = await prisma.answer.findMany({
      where: {
        submissionId
      },
      include: {
        question: true // Incluir la relación con la pregunta
      }
    });

    if (!answers || answers.length === 0) {
      console.log(`No se encontraron respuestas para la presentación ${submissionId}`);
    } else {
      console.log(`Se encontraron ${answers.length} respuestas para la presentación ${submissionId}`);
    }

    return { success: true, answers };
  } catch (error) {
    console.error('Error al obtener las respuestas:', error);
    return { success: false, error: 'Error al obtener las respuestas guardadas' };
  }
}

/**
 * Guarda múltiples respuestas a la vez
 */
export async function updateSubmissionScore(submissionId: number) {
  try {
    // Primero obtenemos la submission para acceder al intento y evaluación
    const submission = await prisma.submission.findUnique({
      where: { id: submissionId },
      include: {
        attempt: {
          include: {
            evaluation: {
              include: {
                questions: true
              }
            }
          }
        }
      }
    });

    if (!submission) {
      return { success: false, error: 'No se encontró la presentación' };
    }

    // Obtener todas las preguntas de la evaluación
    const questions = submission.attempt.evaluation.questions;
    
    // Obtener todas las respuestas existentes para esta presentación
    const existingAnswers = await prisma.answer.findMany({
      where: { submissionId },
      select: { id: true, questionId: true, score: true }
    });

    // Crear un mapa de respuestas por questionId para fácil acceso
    const answerMap = new Map();
    existingAnswers.forEach(answer => {
      answerMap.set(answer.questionId, answer);
    });

    // Preparar operaciones en lote
    const answersToCreate = [];
    const answersToUpdate = [];

    // Identificar preguntas sin respuesta o con respuestas sin calificación
    for (const question of questions) {
      const existingAnswer = answerMap.get(question.id);
      
      if (!existingAnswer) {
        // Si no existe respuesta, añadir a la lista para crear en lote
        answersToCreate.push({
          submissionId,
          questionId: question.id,
          answer: '', // Respuesta vacía
          score: 0 // Asignar 0 puntos
        });
      } else if (existingAnswer.score === null) {
        // Si existe pero no tiene calificación, añadir a la lista para actualizar
        answersToUpdate.push({
          id: existingAnswer.id,
          score: 0
        });
      }
    }

    // Ejecutar operaciones en paralelo
    await Promise.all([
      // Crear respuestas faltantes en lote (si hay alguna)
      answersToCreate.length > 0 ? 
        prisma.answer.createMany({
          data: answersToCreate,
          skipDuplicates: true
        }) : Promise.resolve(),
      
      // Actualizar respuestas sin calificación en paralelo
      ...answersToUpdate.map(answer => 
        prisma.answer.update({
          where: { id: answer.id },
          data: { score: answer.score }
        })
      )
    ]);

    // Calcular el promedio directamente en la base de datos usando una consulta agregada
    const aggregateResult = await prisma.answer.aggregate({
      where: { submissionId },
      _avg: { score: true },
      _count: { score: true }
    });
    
    // Obtener el promedio calculado
    const averageScore = aggregateResult._avg.score || 0;

    // Actualizar el campo score en la presentación
    await prisma.submission.update({
      where: { id: submissionId },
      data: { score: averageScore }
    });

    return { success: true, averageScore };
  } catch (error) {
    console.error('Error al actualizar la calificación promedio:', error);
    return { success: false, error: 'Error al actualizar la calificación promedio' };
  }
}

/**
 * Guarda múltiples respuestas a la vez
 * Optimizado para reducir peticiones a la base de datos procesando respuestas en paralelo
 */
export async function saveAnswers(submissionId: number, answers: StudentAnswer[]) {
  try {
    if (!answers || answers.length === 0) {
      return { success: false, error: 'No hay respuestas para guardar' };
    }

    // Obtener todas las respuestas existentes para esta presentación
    const existingAnswersResult = await prisma.answer.findMany({
      where: {
        submissionId,
        questionId: { in: answers.map(a => a.questionId) }
      },
      select: {
        id: true,
        questionId: true
      }
    });

    // Crear un mapa de respuestas existentes por questionId para fácil acceso
    const existingAnswersMap = new Map();
    existingAnswersResult.forEach(answer => {
      existingAnswersMap.set(answer.questionId, answer);
    });

    // Separar respuestas en nuevas y existentes
    const newAnswers = [];
    const updateOperations = [];
    
    // Clasificar las respuestas
    for (const answer of answers) {
      const existingAnswer = existingAnswersMap.get(answer.questionId);
      
      if (existingAnswer) {
        // Si la respuesta ya existe, actualizarla
        updateOperations.push(
          prisma.answer.update({
            where: { id: existingAnswer.id },
            data: {
              answer: answer.answer,
              score: answer.score !== null ? answer.score : undefined
            }
          })
        );
      } else {
        // Si es una nueva respuesta, añadirla a la lista para crear
        newAnswers.push({
          submissionId,
          questionId: answer.questionId,
          answer: answer.answer,
          score: answer.score !== null ? answer.score : undefined
        });
      }
    }

    // Ejecutar operaciones en paralelo
    await Promise.all([
      // Crear nuevas respuestas en lote si hay alguna
      newAnswers.length > 0 ? 
        prisma.answer.createMany({
          data: newAnswers,
          skipDuplicates: true
        }) : Promise.resolve(),
      
      // Ejecutar todas las actualizaciones en paralelo
      ...updateOperations
    ]);

    // Calcular y actualizar el promedio de calificaciones
    await updateSubmissionScore(submissionId);

    // Obtener todas las respuestas actualizadas
    const savedAnswersResult = await prisma.answer.findMany({
      where: {
        submissionId,
        questionId: { in: answers.map(a => a.questionId) }
      }
    });

    return { success: true, answers: savedAnswersResult };
  } catch (error) {
    console.error('Error al guardar las respuestas:', error);
    return { success: false, error: 'Error al guardar las respuestas' };
  }
}

/**
 * Calcula y actualiza el promedio de calificaciones para una presentación
 * Asigna automáticamente 0 a las preguntas sin responder
 * Optimizado para reducir peticiones a la base de datos
 */

/**
 * Actualiza solo el tiempo fuera de evaluación sin afectar las respuestas
 * Optimizado para reducir peticiones innecesarias a la base de datos
 */
export async function updateTimeOutsideEval(submissionId: number, timeOutsideEval: number) {
  try {
    await prisma.submission.update({
      where: { id: submissionId },
      data: {
        timeOutsideEval: timeOutsideEval
      }
    });

    return { success: true };
  } catch (error) {
    console.error('Error al actualizar tiempo fuera de evaluación:', error);
    return { success: false, error: 'Error al actualizar tiempo fuera de evaluación' };
  }
}

/**
 * Finaliza una presentación marcándola como enviada y genera un reporte de resultados
 */
export async function submitEvaluation(submissionId: number) {
  try {
    // Verificar si la presentación ya fue enviada
    const existingSubmission = await prisma.submission.findUnique({
      where: { id: submissionId },
      include: {
        attempt: {
          include: {
            evaluation: true
          }
        }
      }
    });

    // Si ya fue enviada, retornar error
    if (existingSubmission && existingSubmission.submittedAt !== null) {
      return {
        success: false,
        error: 'Esta presentación ya fue enviada',
        submission: existingSubmission
      };
    }

    // Asegurar que el promedio de calificaciones esté actualizado
    const scoreResult = await updateSubmissionScore(submissionId);
    
    // Obtener todas las respuestas con sus preguntas para generar el reporte
    const answersResult = await getAnswersBySubmissionId(submissionId);
    
    if (!answersResult.success || !scoreResult.success) {
      throw new Error('Error al obtener los datos para el reporte');
    }
    
    // Actualizar la presentación con la fecha de envío usando una transacción para evitar condiciones de carrera
    const submission = await prisma.$transaction(async (tx) => {
      // Verificar nuevamente si la presentación ya fue enviada (dentro de la transacción)
      const currentSubmission = await tx.submission.findUnique({
        where: { id: submissionId }
      });
      
      if (currentSubmission && currentSubmission.submittedAt !== null) {
        return currentSubmission; // Ya fue enviada, devolver sin modificar
      }
      
      // Si no ha sido enviada, actualizarla
      return await tx.submission.update({
        where: { id: submissionId },
        data: {
          submittedAt: new Date()
        }
      });
    });
    
    revalidatePath('/student');
    return { 
      success: true, 
      submission
    };
  } catch (error) {
    console.error('Error al enviar la evaluación:', error);
    // Improve error serialization
    const errorMessage = error instanceof Error 
      ? error.message 
      : 'Error desconocido al enviar la evaluación';
    return { success: false, error: errorMessage };
  }
}