import { GoogleGenAI } from "@google/genai";
import { getApiKey } from "./apiKeyService";

/**
 * Genera una lista de cotejo (checklist) educativa usando Gemini AI.
 * @param params.instructions Instrucciones o criterios para la lista de cotejo (puede ser tema, objetivo, etc)
 * @param params.language Idioma de la lista ('es' o 'en'), por defecto 'es'
 * @returns Un string con la lista de cotejo en formato de texto estructurado (puede ser Markdown o tabla simple)
 *
 * Ejemplo de uso:
 *   await generateChecklistWithGemini({
 *     instructions: 'Evaluar participación en clase de ciencias',
 *     language: 'es'
 *   });
 */
export async function generateChecklistWithGemini({ instructions, language = 'es' }: { instructions: string, language?: 'es' | 'en' }): Promise<string> {
  const apiKey = await getApiKey();
  const ai = new GoogleGenAI({ apiKey });
  const model = 'gemini-1.5-flash';
  let prompt = '';
  if (language === 'en') {
    prompt = `Generate an educational checklist based on the following instructions. The output must be in the following plain text format (do not use Markdown):\nTitle: [Generated title here]\nDescription: [Generated description here]\nCriteria:\n- [Criterion 1]\n- [Criterion 2]\n... and so on.\n\nInstructions: ${instructions}`;
  } else {
    prompt = `Genera una lista de cotejo educativa a partir de las siguientes instrucciones. La salida debe tener el siguiente formato de texto plano (no uses Markdown):\nTítulo: [Aquí el título generado]\nDescripción: [Aquí la descripción generada]\nCriterios:\n- [Criterio 1]\n- [Criterio 2]\n... y así sucesivamente.\n\nInstrucciones: ${instructions}`;
  }
  let response;
  try {
    response = await ai.models.generateContent({
      model,
      contents: prompt
    });
  } catch (err) {
    console.error('Error generando lista de cotejo con Gemini:', err);
    throw new Error('Error generando lista de cotejo con Gemini: ' + (err instanceof Error ? err.message : String(err)));
  }
  const text = response.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('Gemini no devolvió texto. Respuesta: ' + JSON.stringify(response));
  return text;
}
