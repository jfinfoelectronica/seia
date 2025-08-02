import { GoogleGenAI, createUserContent } from "@google/genai";
import { getApiKey } from './apiKeyService';

export interface RubricCriterion {
  criterio: string;
  descriptores: string[];
  escala: string[];
}

export interface RubricResult {
  titulo: string;
  criterios: RubricCriterion[];
  observaciones?: string;
}

/**
 * Genera una rúbrica automática a partir de la descripción de una actividad usando Gemini.
 * @param prompt Descripción de la actividad, objetivo o contexto
 * @returns Rúbrica generada con criterios, descriptores y escalas
 */
export async function generateRubricWithGemini(prompt: string): Promise<RubricResult> {
  const apiKey = await getApiKey();
  const ai = new GoogleGenAI({ apiKey });
  const fullPrompt = `Eres un experto en evaluación educativa. Genera una rúbrica detallada para la siguiente actividad o objetivo:
"""
${prompt}
"""
La rúbrica debe tener:
- Un título
- 3 a 6 criterios claros y relevantes
- Para cada criterio, 3 a 5 descriptores de logro (de menor a mayor)
- Una escala de calificación (por ejemplo: Insuficiente, Básico, Satisfactorio, Excelente o numérica 1-5)
Devuelve SOLO en JSON con la estructura:
{
  titulo: string,
  criterios: [
    { criterio: string, descriptores: string[], escala: string[] }
  ],
  observaciones?: string
}`;
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: createUserContent([fullPrompt]),
  });
  const text = response.text || '';
  try {
    const match = text.match(/\{[\s\S]*\}/);
    if (match) {
      return JSON.parse(match[0]) as RubricResult;
    }
    throw new Error('No se pudo extraer la rúbrica generada.');
  } catch (e) {
    throw new Error('Error al procesar la respuesta de Gemini: ' + (e as Error).message + '\nRespuesta: ' + text);
  }
}

/**
 * Corrige la redacción de un criterio de rúbrica usando Gemini.
 * @param contenido Texto del criterio a corregir
 * @returns Criterio corregido
 */
export async function corregirRedaccionCriterioRubrica(contenido: string): Promise<string> {
  const apiKey = await getApiKey();
  const ai = new GoogleGenAI({ apiKey });
  const prompt = `Corrige la redacción del siguiente criterio de rúbrica para que sea claro, formal y específico. Devuelve solo el texto corregido, sin explicaciones ni comillas.\nCriterio: ${contenido}`;
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: createUserContent([prompt]),
  });
  return (response.text || '').trim();
} 