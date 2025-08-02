import { GoogleGenAI } from "@google/genai";
import { getApiKey } from './apiKeyService';

interface EvaluationResult {
  isCorrect: boolean;
  feedback: string;
  grade?: number; // Nota de 0.0 a 5.0
}

/**
 * Servicio para evaluar respuestas de texto de estudiantes utilizando Google Gemini
 * @param questionText - El texto de la pregunta que se está evaluando
 * @param studentAnswer - La respuesta de texto escrita por el estudiante
 * @param evaluationId - Identificador único de la evaluación
 * @returns Objeto con resultado de evaluación (correcto/incorrecto), retroalimentación y calificación
 */
export async function evaluateTextResponse(
  studentResponse: string,
  questionText: string,
  evaluationId: number
): Promise<EvaluationResult> {
  try {
    // Verificar que tenemos texto para evaluar
    if (!studentResponse || studentResponse.trim() === '') {
      return {
        isCorrect: false,
        feedback: 'Por favor, escribe una respuesta para evaluar.'
      };
    }

    const apiKey = await getApiKey(evaluationId);
    const genAI = new GoogleGenAI({ apiKey });

    // Usar el modelo gemini-2.0-flash para evaluaciones más rápidas
    const model = "gemini-2.0-flash";

    // Crear el prompt para la evaluación
    const prompt = `
    Eres un evaluador de respuestas de texto para estudiantes. Evalúa la siguiente respuesta basada en la pregunta proporcionada.

    PREGUNTA:
    ${questionText}

    RESPUESTA DEL ESTUDIANTE:
    ${studentResponse}

   
    Evalúa si la respuesta responde correctamente a la pregunta. Proporciona retroalimentación constructiva y asigna una nota de 0.0 a 5.0 según la calidad de la respuesta. No des la respuesta completa, solo pistas o sugerencias si hay errores. Si está correcto, felicita al estudiante.



    Responde ÚNICAMENTE en formato JSON con la siguiente estructura:
    {
      "isCorrect": boolean, // true si la respuesta es correcta o aceptable, false si no lo es
      "feedback": string // retroalimentación constructiva, sugerencias o felicitación
      "grade": number // nota de 0.0 a 5.0
    }
    `;

    // Generar la respuesta usando la nueva sintaxis de la API
    const response = await genAI.models.generateContent({
      model: model,
      contents: prompt
    });

    const text = response.text || '';


    // Extraer el JSON de la respuesta
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        const evaluationResult = JSON.parse(jsonMatch[0]) as EvaluationResult;
        return evaluationResult;
      } catch (error) {
        console.error('Error al parsear la respuesta JSON:', error);
      }
    }

    // Si no se pudo extraer un JSON válido, devolver un mensaje genérico
    return {
      isCorrect: false,
      feedback: 'No se pudo evaluar tu respuesta. Por favor, inténtalo de nuevo.'
    };
  } catch (error) {
    console.error('Error al evaluar la respuesta de texto:', error);
    return {
      isCorrect: false,
      feedback: 'Ocurrió un error al evaluar tu respuesta. Por favor, inténtalo de nuevo más tarde.'
    };
  }
}