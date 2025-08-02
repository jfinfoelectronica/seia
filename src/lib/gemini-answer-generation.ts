import { GoogleGenAI } from "@google/genai";
import { getApiKey } from './apiKeyService';

/**
 * Genera una respuesta para una pregunta usando Gemini.
 * @param question Pregunta en texto plano o Markdown.
 * @param language Lenguaje de programación si aplica (opcional).
 * @returns Respuesta generada por Gemini.
 */
export async function generateAnswer(question: string, language?: string): Promise<string> {
  try {
    const apiKey = await getApiKey();
    const genAI = new GoogleGenAI({ apiKey });
    const model = "gemini-2.0-flash";
    const prompt = [
      "Responde exactamente lo que se pregunta, sin explicaciones ni justificaciones. Si es código, solo muestra el bloque de código necesario.",
      "No uses ningún formato markdown, ni bloques de código markdown, ni comillas triples, ni etiquetas especiales. No envuelvas el código en ningún delimitador de bloque (como ``` o ~~~) ni uses etiquetas de lenguaje. Solo texto plano o código puro.",
      language ? `Lenguaje de programación: ${language}` : '',
      `Pregunta: ${question}`
    ].filter(Boolean).join('\n');
    const response = await genAI.models.generateContent({
      model,
      contents: prompt
    });
    let generatedText = response.text || '';
    if (!generatedText) {
      throw new Error("La API de Gemini no devolvió contenido.");
    }
    // Limpieza: elimina cualquier bloque de código markdown o comillas triples
    generatedText = generatedText.replace(/^[`~]{3,}[a-zA-Z]*\n?/gm, '').replace(/[`~]{3,}$/gm, '').replace(/^\s*\n|\n\s*$/g, '').replace(/^"""|"""$/gm, '');
    return generatedText.trim();
  } catch (error) {
    console.error("❌ Error al generar la respuesta con la API de Gemini:", error);
    throw new Error("No se pudo generar la respuesta. Por favor, inténtelo de nuevo.");
  }
}
