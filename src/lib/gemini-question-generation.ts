import { GoogleGenAI } from "@google/genai";
import { getApiKey } from './apiKeyService';

/**
 * Genera una pregunta en formato Markdown usando la API de Gemini.
 * El prompt se adapta según el tipo general (código/texto) y el subtipo seleccionado.
 *
 * @param userPrompt Descripción o idea base de la pregunta.
 * @param mainType 'codigo' | 'texto' (tipo general)
 * @param questionType Subtipo de pregunta (ej: 'enunciado', 'analisis_codigo', etc.)
 * @param language Lenguaje de programación si aplica
 * @returns Pregunta generada como string Markdown
 */
export async function generateQuestion(
  userPrompt: string,
  mainType: 'codigo' | 'texto',
  questionType: string,
  language?: string
): Promise<string> {
  try {
    const apiKey = await getApiKey();
    const genAI = new GoogleGenAI({ apiKey });
    const model = "gemini-2.0-flash";

    // Instrucciones específicas según tipo y subtipo
    let typeInstruction = '';
    let example = '';
    if (mainType === 'codigo') {
      switch (questionType) {
        case 'enunciado':
          typeInstruction = `Redacta una consigna que pida al estudiante escribir una función o fragmento de código en ${language || 'el lenguaje especificado'} para resolver el problema planteado.`;
          example = 'Ejemplo: "Escribe una función en Python que reciba una lista de números y devuelva la suma de los elementos pares."';
          break;
        case 'analisis_codigo':
          typeInstruction = `Redacta una pregunta que incluya un fragmento de código en ${language || 'el lenguaje especificado'} y pide al estudiante analizarlo, explicar qué hace, identificar errores o describir su funcionamiento. Incluye el código en la pregunta.`;
          example = 'Ejemplo: "Analiza el siguiente código en JavaScript y explica qué realiza la función principal.\n\n```javascript\nfunction suma(a, b) { return a + b; }\n```"';
          break;
        case 'completar_codigo':
          typeInstruction = `Redacta una pregunta donde el estudiante deba completar un fragmento de código en ${language || 'el lenguaje especificado'}. Incluye el código incompleto en la pregunta.`;
          example = 'Ejemplo: "Completa el siguiente código en Java para que la función calcule el promedio de una lista de enteros.\n\n```java\npublic double promedio(int[] numeros) {\n    // tu código aquí\n}\n```"';
          break;
        case 'corregir_codigo':
          typeInstruction = `Redacta una pregunta donde el estudiante deba corregir un fragmento de código con errores en ${language || 'el lenguaje especificado'}. Incluye el código con errores en la pregunta.`;
          example = 'Ejemplo: "Corrige los errores en el siguiente código en C++ para que compile y funcione correctamente.\n\n```cpp\nint main() {\n  cout << "Hola" << endl\n  return 0;\n}\n```"';
          break;
        case 'opcion_multiple':
          typeInstruction = `Redacta una pregunta de opción múltiple sobre programación en ${language || 'el lenguaje especificado'}. Incluye el código si es relevante. No incluyas las opciones, solo el enunciado de la pregunta.`;
          example = 'Ejemplo: "¿Cuál de las siguientes opciones describe mejor el propósito de la función mostrada en el código?\n\n```python\ndef cuadrado(x):\n    return x * x\n```"';
          break;
        default:
          typeInstruction = `Redacta una pregunta de programación en ${language || 'el lenguaje especificado'}. El estudiante debe escribir una función o fragmento de código según la consigna.`;
          example = '';
      }
    } else {
      switch (questionType) {
        case 'enunciado':
          typeInstruction = `Redacta una pregunta teórica o conceptual, clara y precisa, sobre el tema indicado.`;
          example = 'Ejemplo: "Explica la importancia de la fotosíntesis en las plantas."';
          break;
        case 'analisis_texto':
          typeInstruction = `Redacta una pregunta que pida al estudiante analizar un texto, fragmento o concepto. El estudiante debe reflexionar, interpretar o argumentar sobre el tema.`;
          example = 'Ejemplo: "Analiza el siguiente fragmento literario y argumenta sobre el mensaje principal del autor."';
          break;
        case 'resumir_texto':
          typeInstruction = `Redacta una pregunta donde el estudiante deba resumir o sintetizar un texto o concepto.`;
          example = 'Ejemplo: "Resume el texto proporcionado en no más de 100 palabras."';
          break;
        case 'opcion_multiple':
          typeInstruction = `Redacta una pregunta de opción múltiple sobre el tema indicado. No incluyas las opciones, solo el enunciado de la pregunta.`;
          example = 'Ejemplo: "¿Cuál de las siguientes afirmaciones es correcta respecto al proceso de mitosis?"';
          break;
        default:
          typeInstruction = `Redacta una pregunta teórica o conceptual, clara y precisa.`;
          example = '';
      }
    }

    // PROMPT FINAL (sin restricciones, pero moderado en longitud)
    const prompt = [
      `Tipo general: ${mainType === 'codigo' ? 'Código' : 'Texto'}`,
      `Tipo de pregunta: ${questionType}`,
      language ? `Lenguaje de programación: ${language}` : '',
      `Tema o idea base: ${userPrompt}`,
      '',
      typeInstruction,
      example ? `\n${example}` : '',
      '',
      "Genera la pregunta completa según las instrucciones anteriores. El enunciado debe ser moderado en longitud (máximo 2000 caracteres) para evitar el consumo excesivo de tokens."
    ].filter(Boolean).join('\n');

    const response = await genAI.models.generateContent({
      model,
      contents: prompt
    });
    const generatedText = response.text || '';
    if (!generatedText) {
      throw new Error("La API de Gemini no devolvió contenido.");
    }
    return generatedText.trim();
  } catch (error) {
    console.error("❌ Error al generar la pregunta con la API de Gemini:", error);
    throw new Error("No se pudo generar la pregunta. Por favor, inténtelo de nuevo.");
  }
}

/**
 * Generates a question in Markdown format using the Gemini API.
 * @param userPrompt - El texto o la descripción proporcionada por el usuario.
 * @param questionType - El tipo de pregunta ('CODE' o 'TEXT').
 * @param language - El lenguaje de programación para las preguntas de código.
 * @param existingQuestions - Una lista de preguntas existentes para evitar duplicados.
 * @returns The generated question as a Markdown string.
 * @throws If the Gemini API returns no content or if an error occurs.
 */
export async function generateQuestionFromTemplate(
  userPrompt: string,
  questionType: string,
  language: string,
  existingQuestions: string[] = []
): Promise<string> {
  try {    

    const apiKey = await getApiKey();
    const genAI = new GoogleGenAI({ apiKey });
    
    const model = "gemini-2.0-flash";

    const existingQuestionsList = existingQuestions.length > 0
      ? `\n\nEvita generar preguntas con las siguientes temáticas, ya que existen en la evaluación:\n- ${existingQuestions.join('\n- ')}`
      : '';

    let promptContext = '';
    if (questionType === 'CODE') {
      promptContext = `Genera una pregunta de programación en ${language} sobre el siguiente tema: "${userPrompt}". La pregunta debe ser clara y concisa. No incluyas la solución.`;
    } else {
      promptContext = `Genera una pregunta de texto abierta y reflexiva sobre el siguiente tema: "${userPrompt}". La pregunta debe invitar a una respuesta detallada.`;
    }

    const prompt = `${promptContext}${existingQuestionsList}`;
  
    const response = await genAI.models.generateContent({
      model: model,
      contents: [prompt]
    });

    const generatedText = response.text || '';
    if (!generatedText) {
      throw new Error("La API de Gemini no devolvió contenido.");
    }

    return generatedText.trim();
  } catch (error) {
    console.error("❌ Error al generar la pregunta con la API de Gemini:", error);
    // Lanzar un nuevo error para que la capa superior pueda manejarlo
    throw new Error('No se pudo generar la pregunta. Por favor, inténtelo de nuevo.');
  }
}

/**
 * Fixes the wording of a question using the Gemini API.
 * @param question The question text to fix.
 * @returns The fixed question as a string.
 */
export async function fixQuestionWording(question: string): Promise<string> {
  try {
    const apiKey = await getApiKey();
    const genAI = new GoogleGenAI({ apiKey });
    const model = "gemini-2.0-flash";
    const prompt = [
      "Corrige la redacción de la siguiente pregunta para que sea clara, precisa y esté bien escrita en español. No cambies el sentido de la pregunta. Devuelve solo la pregunta corregida, sin explicaciones ni comentarios.",
      question
    ].join('\n\n');
    const response = await genAI.models.generateContent({
      model,
      contents: prompt
    });
    const corrected = response.text || '';
    if (!corrected) {
      throw new Error("La API de Gemini no devolvió contenido.");
    }
    return corrected.trim();
  } catch (error) {
    console.error("❌ Error al corregir la redacción de la pregunta con la API de Gemini:", error);
    throw new Error("No se pudo corregir la redacción. Por favor, inténtelo de nuevo.");
  }
}

/**
 * Summarizes and optimizes a question to reduce token count while keeping its meaning.
 * @param question The question text to summarize and optimize.
 * @returns The summarized and optimized question as a string.
 */
export async function summarizeAndOptimizeQuestion(question: string): Promise<string> {
  try {
    const apiKey = await getApiKey();
    const genAI = new GoogleGenAI({ apiKey });
    const model = "gemini-2.0-flash";
    const prompt = [
      "Resume y optimiza la siguiente pregunta para que sea más breve y clara, reduciendo la cantidad de tokens pero manteniendo el mismo sentido. Devuelve solo la pregunta optimizada, sin explicaciones ni comentarios.",
      question
    ].join('\n\n');
    const response = await genAI.models.generateContent({
      model,
      contents: prompt
    });
    const optimized = response.text || '';
    if (!optimized) {
      throw new Error("La API de Gemini no devolvió contenido.");
    }
    return optimized.trim();
  } catch (error) {
    console.error("❌ Error al resumir y optimizar la pregunta con la API de Gemini:", error);
    throw new Error("No se pudo optimizar la pregunta. Por favor, inténtelo de nuevo.");
  }
}